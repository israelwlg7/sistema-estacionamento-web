from django import forms
from django.contrib.auth.forms import AuthenticationForm
from .models import Veiculo, Vaga, Movimento, Ocorrencia
import re

# ── Regras de validação (espelham views.py / mapa.js) ─────────────────
MODELO_RE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s\-\.]+$")
VOGAIS = 'aeiouáéíóúâêôãõàü'

CORES_BASE = {
    'preto', 'branco', 'prata', 'cinza', 'vermelho', 'azul', 'verde', 'amarelo',
    'laranja', 'marrom', 'bege', 'dourado', 'vinho', 'roxo', 'rosa', 'grafite',
    'champagne', 'bronze', 'cobre', 'titânio', 'titanio', 'creme',
}
CORES_MOD = {'claro', 'escuro', 'metalico', 'metálico', 'fosco', 'perolado', 'brilhante'}


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
    for c in low:                                  # 4+ consoantes grudadas
        if c.isalpha() and c not in VOGAIS:
            run += 1
            maxrun = max(maxrun, run)
        else:
            run = 0
    return maxrun < 4


class LoginForm(AuthenticationForm):
    username = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Usuário ou e-mail'})
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Senha'})
    )


class VeiculoForm(forms.ModelForm):
    class Meta:
        model = Veiculo
        fields = ['placa', 'modelo', 'cor', 'vaga']
        widgets = {
            'placa': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'ABC-1234 ou ABC1D23'}),
            'modelo': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: Onix 1.0'}),
            'cor': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: Prata'}),
            'vaga': forms.Select(attrs={'class': 'form-control'}),
        }

    def clean_placa(self):
        placa = self.cleaned_data.get('placa')
        if placa:
            placa_limpa = placa.upper().replace('-', '').strip()
            padrao_antigo = r'^[A-Z]{3}[0-9]{4}$'
            padrao_mercosul = r'^[A-Z]{3}[0-9][A-Z][0-9]{2}$'
            if not (re.match(padrao_antigo, placa_limpa) or re.match(padrao_mercosul, placa_limpa)):
                raise forms.ValidationError('Placa inválida! Use ABC-1234 (antiga) ou ABC1D23 (Mercosul).')
            if re.match(padrao_antigo, placa_limpa):
                return f"{placa_limpa[:3]}-{placa_limpa[3:]}"
            return placa_limpa
        return placa

    def clean_modelo(self):
        modelo = (self.cleaned_data.get('modelo') or '').strip()
        if not modelo:
            raise forms.ValidationError('Modelo é obrigatório.')
        if len(modelo) < 2 or len(modelo) > 50:
            raise forms.ValidationError('Modelo deve ter entre 2 e 50 caracteres.')
        if not MODELO_RE.match(modelo):
            raise forms.ValidationError('Modelo com caracteres inválidos — use letras, números, espaço ou hífen.')
        if not _tem_letras(modelo):
            raise forms.ValidationError('Modelo deve conter letras (ex: Onix, Civic).')
        if not _modelo_valido(modelo):
            raise forms.ValidationError('Modelo inválido — digite um nome de carro válido (ex: Onix, Civic, HB20).')
        return modelo

    def clean_cor(self):
        cor = (self.cleaned_data.get('cor') or '').strip()
        if not cor:
            raise forms.ValidationError('Cor é obrigatória.')
        if len(cor) < 2 or len(cor) > 20:
            raise forms.ValidationError('Cor deve ter entre 2 e 20 caracteres.')
        if not _cor_valida(cor):
            raise forms.ValidationError('Cor inválida — use uma cor conhecida (ex: Prata, Preto, Cinza escuro).')
        return cor


class RegistroForm(forms.Form):
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'seu@email.com'})
    )
    placa = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'ABC-1234'})
    )


class OcorrenciaForm(forms.ModelForm):
    class Meta:
        model = Ocorrencia
        fields = ['tipo', 'titulo', 'descricao', 'placa_veiculo', 'vaga']
        widgets = {
            'tipo': forms.Select(attrs={'class': 'form-control'}),
            'titulo': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Resumo do problema'}),
            'descricao': forms.Textarea(attrs={'class': 'form-control', 'rows': 4, 'placeholder': 'Descreva detalhadamente o ocorrido...'}),
            'placa_veiculo': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'ABC-1234 (opcional)'}),
            'vaga': forms.Select(attrs={'class': 'form-control'}),
        }

    def clean_titulo(self):
        titulo = (self.cleaned_data.get('titulo') or '').strip()   # ← protegido contra None
        if not titulo:
            tipo = self.cleaned_data.get('tipo', 'OUTRO')
            tipo_display = dict(Ocorrencia.TIPOS).get(tipo, 'Ocorrência')
            return f'{tipo_display} registrada pelo usuário'
        if len(titulo) < 3:
            raise forms.ValidationError('Título muito curto. Use pelo menos 3 caracteres.')
        if len(titulo) > 120:
            raise forms.ValidationError('Título muito longo. Máximo 120 caracteres.')
        return titulo

    def clean_placa_veiculo(self):
        # CORREÇÃO DO CRASH: campo null=True entrega None quando vazio;
        # o "or ''" garante string antes do .strip()
        placa = (self.cleaned_data.get('placa_veiculo') or '').strip()
        if not placa:
            return None
        placa_limpa = placa.upper().replace('-', '')
        padrao_antigo = r'^[A-Z]{3}[0-9]{4}$'
        padrao_mercosul = r'^[A-Z]{3}[0-9][A-Z][0-9]{2}$'
        if not (re.match(padrao_antigo, placa_limpa) or re.match(padrao_mercosul, placa_limpa)):
            raise forms.ValidationError('Placa inválida! Use ABC-1234 (antiga) ou ABC1D23 (Mercosul).')
        if re.match(padrao_antigo, placa_limpa):
            return f"{placa_limpa[:3]}-{placa_limpa[3:]}"
        return placa_limpa