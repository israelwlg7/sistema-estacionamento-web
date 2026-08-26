from django.db import models
from django.contrib.auth.models import User

class Vaga(models.Model):
    STATUS = (
        ("LIVRE", "Livre"),
        ("OCUPADA", "Ocupada"),
        ("RESERVADA", "Reservada")
    )
    numero = models.PositiveIntegerField(unique=True)
    setor = models.CharField(max_length=30, default="A")
    status = models.CharField(max_length=15, choices=STATUS, default="LIVRE")
    posicao_x = models.IntegerField(default=0)
    posicao_y = models.IntegerField(default=0)
    
    def __str__(self):
        return f"Vaga {self.numero}"

class Veiculo(models.Model):
    PAGAMENTO = (
        ("", "—"),
        ("SOLICITADO", "Saída solicitada"),
        ("PAGO", "Pagamento confirmado"),
        ("LIBERADO", "Liberado pelo admin")
    )
    placa = models.CharField(max_length=10, unique=True, blank=True, null=True)
    modelo = models.CharField(max_length=100)
    cor = models.CharField(max_length=40)
    vaga = models.ForeignKey(Vaga, on_delete=models.SET_NULL, null=True, blank=True, related_name="veiculos")
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    entrada = models.DateTimeField(auto_now_add=True)
    saida = models.DateTimeField(blank=True, null=True)
    ativo = models.BooleanField(default=True)
    pagamento = models.CharField(max_length=12, choices=PAGAMENTO, blank=True, default="")
    valor_final = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    saida_solicitada = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return self.placa or f"Veículo {self.id}"

class Camera(models.Model):
    nome = models.CharField(max_length=100)
    local = models.CharField(max_length=100)
    ip = models.CharField(max_length=60, blank=True, null=True)
    ativa = models.BooleanField(default=True)
    
    def __str__(self):
        return self.nome

class Movimento(models.Model):
    TIPO = (
        ("ENTRADA", "Entrada"),
        ("SAIDA", "Saída")
    )
    veiculo = models.ForeignKey(Veiculo, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=20, choices=TIPO)
    horario = models.DateTimeField(auto_now_add=True)
    observacao = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.tipo} - {self.veiculo}"

class AvisoVaga(models.Model):
    STATUS = (
        ("LIVRE", "Livre"),
        ("OCUPADA", "Ocupada")
    )
    vaga = models.ForeignKey(Vaga, on_delete=models.CASCADE, related_name="avisos")
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=10, choices=STATUS)
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ("-criado_em",)
        indexes = [models.Index(fields=["vaga", "-criado_em"])]
    
    def __str__(self):
        return f"Vaga {self.vaga.numero} → {self.status}"

class ChatMsg(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    texto = models.CharField(max_length=280)
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ("-criado_em",)
        indexes = [models.Index(fields=["-criado_em"])]
    
    def __str__(self):
        return f"{self.usuario}: {self.texto[:30]}"

class Ocorrencia(models.Model):
    TIPOS = (
        ('AVARIA', 'Avaria / Dano no Veículo'),
        ('ROUBO', 'Furto / Roubo'),
        ('COLISAO', 'Colisão / Batida'),
        ('CHAVEIRO', 'Problema com Chave / Tranca'),
        ('BRIGA', 'Desentendimento / Incidente'),
        ('OUTRO', 'Outro Problema'),
    )
    STATUS = (
        ('PENDENTE', 'Pendente'),
        ('EM_ANALISE', 'Em Análise'),
        ('RESOLVIDO', 'Resolvido'),
    )
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name="ocorrencias")
    tipo = models.CharField(max_length=20, choices=TIPOS, default='OUTRO')
    titulo = models.CharField(max_length=120)
    descricao = models.TextField()
    placa_veiculo = models.CharField(max_length=10, blank=True, null=True)
    vaga = models.ForeignKey(Vaga, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=15, choices=STATUS, default='PENDENTE')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ("-criado_em",)
    
    def __str__(self):
        return f"[{self.get_status_display()}] {self.titulo} ({self.usuario.username})"