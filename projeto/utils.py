import re
from .models import Vaga, Veiculo, Movimento
from django.utils import timezone

TARIFA_HORA = 8.0   # Tarifa por hora
PLACA_ANTIGA = re.compile(r'^[A-Z]{3}[0-9]{4}$')               # ABC1234
PLACA_MERCOSUL = re.compile(r'^[A-Z]{3}[0-9][A-Z][0-9]{2}$')   # ABC1D23

def normalizar_placa(placa):
    if not placa:
        return None
    return placa.strip().upper().replace('-', '').replace(' ', '')

def valida_placa(placa):
    """Retorna a placa normalizada ou levanta ValueError se o formato for inválido."""
    p = normalizar_placa(placa)
    if not p:
        return None
    if PLACA_ANTIGA.match(p) or PLACA_MERCOSUL.match(p):
        return p
    raise ValueError(f"Placa '{placa}' inválida. Use o formato ABC1234 (antigo) ou ABC1D23 (Mercosul).")

def get_vagas_status():
    vagas = Vaga.objects.all().order_by('setor', 'numero')
    data = []
    for vaga in vagas:
        veiculo = vaga.veiculos.filter(ativo=True).first()
        
        veiculo_data = None
        if veiculo:
            veiculo_data = {
                'placa': veiculo.placa, 
                'modelo': veiculo.modelo,
                'id': veiculo.id, 
                'dono_id': veiculo.usuario_id,
                'pagamento': veiculo.pagamento,
                'valor_final': str(veiculo.valor_final) if veiculo.valor_final is not None else None,
            }
            
        data.append({
            'id': vaga.id, 
            'numero': vaga.numero, 
            'setor': vaga.setor, 
            'status': vaga.status,
            'posicao_x': vaga.posicao_x, 
            'posicao_y': vaga.posicao_y,
            'veiculo': veiculo_data,
        })
    return data

def calcular_valor(veiculo):
    total_min = int((timezone.now() - veiculo.entrada).total_seconds() // 60)
    horas = max(1, -(-total_min // 60))      # arredonda pra cima, mínimo 1h
    return round(horas * TARIFA_HORA, 2)

def registrar_entrada_veiculo(placa, modelo, cor, vaga_id, usuario=None):
    placa = valida_placa(placa)
    vaga = Vaga.objects.get(id=vaga_id)
    
    if vaga.status != 'LIVRE': 
        raise Exception(f"Vaga {vaga.numero} não está livre")
        
    veiculo = Veiculo.objects.create(
        placa=placa, modelo=modelo, cor=cor, vaga=vaga,
        usuario=usuario, entrada=timezone.now(), ativo=True
    )
    
    vaga.status = 'OCUPADA'
    vaga.save()
    
    Movimento.objects.create(
        veiculo=veiculo, tipo='ENTRADA', observacao=f"Entrada na vaga {vaga.numero}"
    )
    return veiculo

def registrar_saida_veiculo(veiculo_id):
    veiculo = Veiculo.objects.get(id=veiculo_id)
    vaga = veiculo.vaga
    
    veiculo.saida = timezone.now()
    veiculo.ativo = False
    veiculo.save()
    
    if vaga: 
        vaga.status = 'LIVRE'
        vaga.save()
        
    Movimento.objects.create(
        veiculo=veiculo, tipo='SAIDA', observacao=f"Saída da vaga {vaga.numero if vaga else '?'}"
    )
    return veiculo

def solicitar_saida(veiculo_id, usuario):
    v = Veiculo.objects.get(id=veiculo_id)
    if v.usuario_id != usuario.id: 
        raise Exception("Este veículo não é seu.")
    if not v.ativo: 
        raise Exception("Veículo já finalizado.")
    if v.pagamento in ("SOLICITADO", "PAGO", "LIBERADO"): 
        raise Exception("Saída já em andamento.")
        
    v.valor_final = calcular_valor(v)
    v.pagamento = "SOLICITADO"
    v.saida_solicitada = timezone.now()
    v.save()
    return v

def pagar_saida(veiculo_id, usuario):
    v = Veiculo.objects.get(id=veiculo_id)
    if v.usuario_id != usuario.id: 
        raise Exception("Este veículo não é seu.")
    if v.pagamento != "SOLICITADO": 
        raise Exception("Solicite a saída primeiro.")
        
    v.pagamento = "PAGO"
    v.save()
    return v

def get_dashboard_stats():
    total = Vaga.objects.count()
    livres = Vaga.objects.filter(status='LIVRE').count()
    ocup = Vaga.objects.filter(status='OCUPADA').count()
    res = Vaga.objects.filter(status='RESERVADA').count()
    ativos = Veiculo.objects.filter(ativo=True).count()
    
    hoje = timezone.now().date()
    ent = Movimento.objects.filter(tipo='ENTRADA', horario__date=hoje).count()
    sai = Movimento.objects.filter(tipo='SAIDA', horario__date=hoje).count()
    
    return {
        'total_vagas': total, 
        'vagas_livres': livres, 
        'vagas_ocupadas': ocup,
        'vagas_reservadas': res, 
        'veiculos_ativos': ativos, 
        'entradas_hoje': ent,
        'saidas_hoje': sai, 
        'ocupacao_percentual': (ocup / total * 100) if total else 0
    }