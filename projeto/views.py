import json
import re
from datetime import timedelta

from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import login, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.urls import reverse
from django.views.decorators.http import require_http_methods
from django.utils import timezone

from .models import Vaga, Veiculo, Movimento, AvisoVaga, ChatMsg, Ocorrencia
from .forms import LoginForm, OcorrenciaForm
from .utils import (
    get_vagas_status, get_dashboard_stats, TARIFA_HORA,
    registrar_entrada_veiculo, registrar_saida_veiculo,
    solicitar_saida, pagar_saida
)

VAGAS_A, VAGAS_B = 9, 9
JANELA_AVISO, COOLDOWN_AVISO = 30, 5

NOME_RE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[\s'-][A-Za-zÀ-ÖØ-öø-ÿ]+)+$")
MODELO_RE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s\-\.]+$")

CORES_BASE = {
    'preto', 'branco', 'prata', 'cinza', 'vermelho', 'azul', 'verde', 'amarelo',
    'laranja', 'marrom', 'bege', 'dourado', 'vinho', 'roxo', 'rosa', 'grafite',
    'champagne', 'bronze', 'cobre', 'titânio', 'titanio', 'creme',
}
CORES_MOD = {'claro', 'escuro', 'metalico', 'metálico', 'fosco', 'perolado', 'brilhante'}
VOGAIS = 'aeiouáéíóúâêôãõàü'


def _tem_letras(texto, minimo=2):
    return sum(1 for c in texto if c.isalpha()) >= minimo


def _cor_valida(cor):
    toks = cor.lower().split()
    if not toks:
        return False
    return any(t in CORES_BASE for t in toks) and all(t in CORES_BASE or t in CORES_MOD for t in toks)


def _modelo_valido(modelo):
    low = modelo.lower()
    if not any(c in VOGAIS for c in low):          # precisa de vogal
        return False
    if re.search(r'(.)\1{3,}', low):               # 4+ letras repetidas
        return False
    run = maxrun = 0
    for c in low:
        if c.isalpha() and c not in VOGAIS:        # 4+ consoantes grudadas
            run += 1
            maxrun = max(maxrun, run)
        else:
            run = 0
    return maxrun < 4


# ── auth ────────────────────────────────────────────────
def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')

    register_url = reverse('login') + '?tab=register'

    if request.method == 'POST' and 'pass1' in request.POST:
        full = ' '.join(request.POST.get('full_name', '').strip().split())
        email = request.POST.get('email', '').strip().lower()
        p1 = request.POST.get('pass1', '')
        p2 = request.POST.get('pass2', '')

        if not (full and email and p1):
            messages.error(request, 'Preencha todos os campos.')
            return redirect(register_url)

        if not NOME_RE.match(full):
            messages.error(request, 'Digite seu nome completo, só com letras (ex: Ana Ribeiro).')
            return redirect(register_url)

        try:
            validate_email(email)
        except ValidationError:
            messages.error(request, 'Digite um e-mail válido (ex: nome@provedor.com).')
            return redirect(register_url)

        if User.objects.filter(email=email).exists():
            messages.error(request, 'Este e-mail já está cadastrado. Entre com ele.')
            return redirect(register_url)

        if len(p1) < 4:
            messages.error(request, 'Senha com pelo menos 4 caracteres.')
            return redirect(register_url)

        if p1 != p2:
            messages.error(request, 'As senhas não conferem.')
            return redirect(register_url)

        base = email.split('@')[0] or 'user'
        u, n = base, 1
        while User.objects.filter(username=u).exists():
            u = f"{base}{n}"
            n += 1

        user = User.objects.create_user(username=u, email=email, password=p1, first_name=full)
        login(request, user)
        messages.success(request, f'Conta criada, {full}!')
        return redirect('dashboard')

    if request.method == 'POST':
        data = request.POST.copy()
        ident = (data.get('username') or '').strip()
        if '@' in ident:
            u = User.objects.filter(email__iexact=ident).first()
            if u:
                data['username'] = u.username
        form = LoginForm(request, data=data)
        if form.is_valid():
            login(request, form.get_user())
            return redirect('dashboard')
    else:
        form = LoginForm()

    return render(request, 'login.html', {'form': form})


def logout_view(request):
    logout(request)
    return redirect('login')


# ── seed / slots ───────────────────────────────────────
def _ensure_vagas():
    for n in range(1, VAGAS_A + 1):
        Vaga.objects.get_or_create(numero=n, defaults={'setor': 'A', 'status': 'LIVRE'})
    for n in range(VAGAS_A + 1, VAGAS_A + VAGAS_B + 1):
        Vaga.objects.get_or_create(numero=n, defaults={'setor': 'B', 'status': 'LIVRE'})
    Vaga.objects.filter(numero__gt=VAGAS_A + VAGAS_B).exclude(veiculos__ativo=True).delete()


def _slots(start, count, x0, step, w):
    return [
        {'n': start + i, 'x': round(x0 + i * step, 1), 'w': w, 'cx': round(x0 + i * step + w / 2, 1)}
        for i in range(count)
    ]


# ── páginas ───────────────────────────────────────────
def dashboard(request):
    _ensure_vagas()
    stats = get_dashboard_stats()
    agora = timezone.now()
    patio = []
    for v in Veiculo.objects.filter(ativo=True).select_related('vaga').order_by('-entrada')[:12]:
        m = int((agora - v.entrada).total_seconds() // 60)
        h, mm = divmod(m, 60)
        patio.append({
            'placa': v.placa, 'modelo': v.modelo, 'cor': v.cor, 'entrada': v.entrada,
            'vaga': v.vaga, 'tempo': f"{h}h {mm:02d}m",
            'valor': max(1, -(-m // 60)) * TARIFA_HORA,
            'meu': v.usuario_id == request.user.id if request.user.is_authenticated else False,
            'pagamento': v.pagamento
        })
    return render(request, 'dashboard.html', {'stats': stats, 'patio': patio})


def mapa(request):
    _ensure_vagas()
    return render(request, 'mapa.html', {
        'slots_a': _slots(1, VAGAS_A, 84, 97.5, 88),
        'slots_b': _slots(VAGAS_A + 1, VAGAS_B, 150, 92.0, 84)
    })


def assistente(request):
    return render(request, 'assistente.html')


def registrar_page(request):
    _ensure_vagas()
    return render(request, 'registrar.html', {'liberado': request.user.is_authenticated})


@login_required
def perfil(request):
    if request.method == 'POST':
        nome = ' '.join(request.POST.get('new_first_name', '').strip().split())
        email = request.POST.get('new_email', '').strip().lower()
        p1 = request.POST.get('new_pass1', '')
        p2 = request.POST.get('new_pass2', '')

        if nome:
            if not NOME_RE.match(nome):
                messages.error(request, 'Digite um nome completo válido, só com letras.')
                return redirect('perfil')
            request.user.first_name = nome

        if email:
            try:
                validate_email(email)
                request.user.email = email
            except ValidationError:
                messages.error(request, 'Digite um e-mail válido.')
                return redirect('perfil')

        request.user.save()

        if p1:
            if len(p1) < 4:
                messages.error(request, 'Nova senha com pelo menos 4 caracteres.')
            elif p1 != p2:
                messages.error(request, 'A confirmação não conferiu.')
            else:
                request.user.set_password(p1)
                request.user.save()
                update_session_auth_hash(request, request.user)
                messages.success(request, 'Senha alterada com sucesso!')

        if not p1:
            messages.success(request, 'Perfil atualizado!')

        return redirect('perfil')

    entradas = Veiculo.objects.filter(usuario=request.user).count()
    avisos = AvisoVaga.objects.filter(usuario=request.user).count()
    atual = Veiculo.objects.filter(usuario=request.user, ativo=True).select_related('vaga').first()

    return render(request, 'perfil.html', {'entradas': entradas, 'avisos': avisos, 'atual': atual})


@login_required
def excluir_conta(request):
    if request.method == 'POST':
        veiculo_ativo = Veiculo.objects.filter(usuario=request.user, ativo=True).first()
        if veiculo_ativo:
            vaga_info = f" (vaga {veiculo_ativo.vaga.numero})" if veiculo_ativo.vaga else ""
            messages.error(
                request,
                f'Você tem um veículo ativo no estacionamento{vaga_info}. '
                f'Retire o veículo (solicite saída e pague) antes de excluir sua conta.'
            )
            return redirect('perfil')

        senha = request.POST.get('confirmar_senha', '')
        if not request.user.check_password(senha):
            messages.error(request, 'Senha incorreta. Sua conta não foi excluída.')
            return redirect('perfil')

        user_email = request.user.email
        user = request.user
        logout(request)
        user.delete()
        messages.success(request, f'Conta {user_email} excluída permanentemente.')
        return redirect('login')

    return redirect('perfil')


@login_required
def configuracoes(request):
    return render(request, 'config.html')


def suporte(request):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            messages.error(request, 'Faça login para registrar ocorrências.')
            return redirect('suporte')

        form = OcorrenciaForm(request.POST)
        if form.is_valid():
            ocorrencia = form.save(commit=False)
            ocorrencia.usuario = request.user
            ocorrencia.save()
            messages.success(request, 'Ocorrência registrada com sucesso! Entraremos em contato em breve.')
            return redirect('suporte')
        else:
            erros = []
            for campo, erros_campo in form.errors.items():
                label = form.fields[campo].label if campo in form.fields else campo
                erros.append(f'{label}: {erros_campo[0]}')
            messages.error(request, 'Erros no formulário: ' + ' | '.join(erros))
    else:
        form = OcorrenciaForm()

    vagas = Vaga.objects.all().order_by('setor', 'numero')
    ocorrencias = Ocorrencia.objects.filter(usuario=request.user).order_by('-criado_em') if request.user.is_authenticated else []

    return render(request, 'suporte.html', {'form': form, 'vagas': vagas, 'ocorrencias': ocorrencias})


# ── APIs ──────────────────────────────────────────────
def _avisos_recentes():
    lim = timezone.now() - timedelta(minutes=JANELA_AVISO)
    out = {}
    for a in AvisoVaga.objects.filter(criado_em__gte=lim).select_related('usuario').order_by('-criado_em'):
        if a.vaga_id not in out:
            out[a.vaga_id] = {
                'status': a.status,
                'usuario': (a.usuario.first_name or a.usuario.username) if a.usuario else 'alguém',
                'min': int((timezone.now() - a.criado_em).total_seconds() // 60)
            }
    return out


@require_http_methods(["GET"])
def api_vagas(request):
    vagas = get_vagas_status()
    avisos = _avisos_recentes()
    uid = request.user.id if request.user.is_authenticated else None

    for v in vagas:
        av = avisos.get(v['id'])
        if av and av['status'] != v['status']:
            v['aviso'] = av
        if v['veiculo'] and uid and v['veiculo']['dono_id'] == uid:
            v['veiculo']['meu'] = True

    return JsonResponse({'vagas': vagas})


@require_http_methods(["GET"])
def api_avisos(request):
    itens = []
    for a in AvisoVaga.objects.select_related('vaga', 'usuario').order_by('-criado_em')[:40]:
        nome = (a.usuario.first_name or a.usuario.username) if a.usuario else 'Anônimo'
        itens.append({
            'id': a.id, 'vaga': a.vaga.numero, 'setor': a.vaga.setor, 'status': a.status,
            'usuario': nome, 'inicial': nome[0].upper() if nome else '?',
            'min': int((timezone.now() - a.criado_em).total_seconds() // 60)
        })
    return JsonResponse({'avisos': itens})


@require_http_methods(["GET"])
def api_veiculos(request):
    vs = Veiculo.objects.filter(ativo=True).select_related('vaga')
    return JsonResponse({'veiculos': [{
        'id': v.id, 'placa': v.placa, 'modelo': v.modelo, 'cor': v.cor,
        'vaga': v.vaga.numero if v.vaga else None, 'entrada': v.entrada.isoformat()
    } for v in vs]})


def api_chat(request):
    if request.method == "GET":
        itens = []
        for m in ChatMsg.objects.select_related('usuario').order_by('-criado_em')[:60]:
            nome = (m.usuario.first_name or m.usuario.username) if m.usuario else 'Anônimo'
            itens.append({
                'id': m.id, 'texto': m.texto, 'usuario': nome,
                'inicial': nome[0].upper() if nome else '?',
                'min': int((timezone.now() - m.criado_em).total_seconds() // 60)
            })
        return JsonResponse({'msgs': itens})

    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Faça login para conversar.'}, status=401)

    try:
        d = json.loads(request.body)
        texto = (d.get('texto') or '').strip()
        if not texto:
            return JsonResponse({'error': 'Mensagem vazia.'}, status=400)

        m = ChatMsg.objects.create(usuario=request.user, texto=texto[:280])
        nome = m.usuario.first_name or m.usuario.username
        return JsonResponse({'success': True, 'msg': {
            'id': m.id, 'texto': m.texto, 'usuario': nome, 'inicial': nome[0].upper(), 'min': 0
        }})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["POST"])
def registrar_entrada(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Faça login para registrar uma entrada.'}, status=401)

    try:
        d = json.loads(request.body)
        placa = (d.get('placa') or '').strip().upper() or None
        modelo = (d.get('modelo') or '').strip()
        cor = (d.get('cor') or '').strip()
        vid = d.get('vaga_id')

        # ── Validações fortes (espelham o front) ──
        if not modelo:
            return JsonResponse({'error': 'Informe o modelo do veículo.'}, status=400)
        if not vid:
            return JsonResponse({'error': 'Selecione uma vaga.'}, status=400)
        if len(modelo) < 2 or len(modelo) > 50:
            return JsonResponse({'error': 'Modelo deve ter entre 2 e 50 caracteres.'}, status=400)
        if not MODELO_RE.match(modelo):
            return JsonResponse({'error': 'Modelo com caracteres inválidos — use letras, números, espaço ou hífen.'}, status=400)
        if not _tem_letras(modelo):
            return JsonResponse({'error': 'Modelo deve conter letras (ex: Onix, Civic).'}, status=400)
        if not _modelo_valido(modelo):
            return JsonResponse({'error': 'Modelo inválido — digite um nome de carro válido (ex: Onix, Civic, HB20).'}, status=400)

        if not cor:
            return JsonResponse({'error': 'Informe a cor do veículo.'}, status=400)
        if len(cor) < 2 or len(cor) > 20:
            return JsonResponse({'error': 'Cor deve ter entre 2 e 20 caracteres.'}, status=400)
        if not _cor_valida(cor):
            return JsonResponse({'error': 'Cor inválida — use uma cor conhecida (ex: Prata, Preto, Cinza escuro).'}, status=400)

        # Valida placa se fornecida
        if placa:
            placa_limpa = placa.replace('-', '')
            padrao_antigo = r'^[A-Z]{3}[0-9]{4}$'
            padrao_mercosul = r'^[A-Z]{3}[0-9][A-Z][0-9]{2}$'
            if not (re.match(padrao_antigo, placa_limpa) or re.match(padrao_mercosul, placa_limpa)):
                return JsonResponse({'error': 'Placa inválida! Use ABC-1234 (antiga) ou ABC1D23 (Mercosul).'}, status=400)

        ve = registrar_entrada_veiculo(placa=placa, modelo=modelo, cor=cor, vaga_id=vid, usuario=request.user)
        return JsonResponse({'success': True, 'veiculo': {'id': ve.id, 'placa': ve.placa, 'vaga': ve.vaga.numero}})

    except ValidationError as ve:
        return JsonResponse({'error': str(ve)}, status=400)
    except Exception as e:
        msg = str(e).lower()
        if 'placa' in msg and 'única' in msg:
            return JsonResponse({'error': 'Essa placa já está cadastrada no sistema.'}, status=400)
        if 'vaga' in msg and 'livre' in msg:
            return JsonResponse({'error': 'Esta vaga não está disponível.'}, status=400)
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["POST"])
def registrar_saida(request, veiculo_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Faça login.'}, status=401)
    try:
        ve = registrar_saida_veiculo(veiculo_id)
        return JsonResponse({'success': True, 'veiculo': {'placa': ve.placa, 'saida': ve.saida.isoformat()}})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["POST"])
def api_aviso(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Faça login para avisar.'}, status=401)
    try:
        d = json.loads(request.body)
        vid = d.get('vaga_id')
        st = (d.get('status') or '').upper()

        if st not in ('LIVRE', 'OCUPADA'):
            return JsonResponse({'error': 'Status inválido.'}, status=400)

        vaga = Vaga.objects.get(id=vid)
        lim = timezone.now() - timedelta(minutes=COOLDOWN_AVISO)

        if AvisoVaga.objects.filter(vaga=vaga, usuario=request.user, criado_em__gte=lim).exists():
            return JsonResponse({'error': 'Você já avisou esta vaga há pouco.'}, status=429)

        AvisoVaga.objects.create(vaga=vaga, usuario=request.user, status=st)
        return JsonResponse({'success': True, 'vaga': vaga.numero, 'status': st})

    except Vaga.DoesNotExist:
        return JsonResponse({'error': 'Vaga não encontrada.'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["POST"])
def api_checkout_solicitar(request, veiculo_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Faça login.'}, status=401)
    try:
        v = solicitar_saida(veiculo_id, request.user)
        return JsonResponse({'success': True, 'valor': str(v.valor_final), 'pagamento': v.pagamento})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["POST"])
def api_checkout_pagar(request, veiculo_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Faça login.'}, status=401)
    try:
        v = pagar_saida(veiculo_id, request.user)
        return JsonResponse({'success': True, 'pagamento': v.pagamento})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ── Handlers de erro ─────────────────────────────────────
def custom_400(request, exception=None):
    return render(request, 'errors/400.html', {
        'error_code': '400',
        'error_name': 'Erro HTTP: 400 (Requisição Inválida)',
        'error_message': 'Os dados enviados no formulário ou requisição estão incorretos ou incompletos.'
    }, status=400)


def custom_403(request, exception=None):
    return render(request, 'errors/403.html', {
        'error_code': '403',
        'error_name': 'Erro HTTP: 403 (Acesso Negado / CSRF)',
        'error_message': 'Você não tem permissão para acessar este recurso ou a validação de segurança CSRF falhou.'
    }, status=403)


def custom_404(request, exception=None):
    return render(request, 'errors/404.html', {
        'error_code': '404',
        'error_name': 'Erro HTTP: 404 (Página Não Encontrada)',
        'error_message': 'A página ou recurso que você tentou acessar não existe ou foi movido.'
    }, status=404)


def custom_429(request, exception=None):
    return render(request, 'errors/429.html', {
        'error_code': '429',
        'error_name': 'Erro HTTP: 429 (Muitas Requisições)',
        'error_message': 'Você fez muitas requisições em um curto período. Aguarde alguns instantes e tente novamente.'
    }, status=429)