import re
from django.core.exceptions import ValidationError


def validate_email_strong(email):
    """Valida e-mail exigindo formato válido"""
    if not email or not str(email).strip():
        raise ValidationError('E-mail é obrigatório.')

    email = str(email).strip().lower()
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    if not re.match(pattern, email):
        raise ValidationError('E-mail inválido. Use o formato: usuario@dominio.com')
    return email


def validate_placa_mercosul(placa):
    """Valida placas no formato antigo (ABC-1234) ou Mercosul (ABC1D23)"""
    if not placa:
        return None

    placa_limpa = str(placa).upper().replace('-', '').strip()
    if not placa_limpa:
        return None

    padrao_antigo = r'^[A-Z]{3}[0-9]{4}$'
    padrao_mercosul = r'^[A-Z]{3}[0-9][A-Z][0-9]{2}$'

    if not (re.match(padrao_antigo, placa_limpa) or re.match(padrao_mercosul, placa_limpa)):
        raise ValidationError('Placa inválida. Use ABC-1234 ou ABC1D23 (Mercosul).')

    if re.match(padrao_antigo, placa_limpa):
        return f"{placa_limpa[:3]}-{placa_limpa[3:]}"
    return placa_limpa


def validate_texto_veiculo(texto, campo_nome='Campo', max_length=40):
    """Valida modelo ou cor: exige letras, aceita números misturados (Onix 1.0, HB20)."""
    if not texto or not str(texto).strip():
        raise ValidationError(f'{campo_nome} é obrigatório.')

    texto_limpo = str(texto).strip()
    if len(texto_limpo) > max_length:
        raise ValidationError(f'{campo_nome} deve ter no máximo {max_length} caracteres.')

    if sum(1 for c in texto_limpo if c.isalpha()) < 2:
        raise ValidationError(f'{campo_nome} deve conter letras válidas, não apenas números.')

    texto_seguro = re.sub(r'[<>"\'&]', '', texto_limpo)
    if len(texto_seguro) < 2:
        raise ValidationError(f'{campo_nome} deve ter pelo menos 2 caracteres.')

    return texto_seguro


def validate_texto_simples(texto, campo_nome='Campo', max_length=50):
    """Valida texto simples"""
    if not texto or not str(texto).strip():
        raise ValidationError(f'{campo_nome} é obrigatório.')

    texto_limpo = re.sub(r'[<>"\'&]', '', str(texto).strip())
    if len(texto_limpo) > max_length:
        raise ValidationError(f'{campo_nome} deve ter no máximo {max_length} caracteres.')

    return texto_limpo