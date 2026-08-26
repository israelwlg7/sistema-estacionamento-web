from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Vaga, Veiculo, Camera, Movimento, AvisoVaga, ChatMsg, Ocorrencia

@admin.register(Vaga)
class VagaAdmin(admin.ModelAdmin):
    list_display = ("numero", "setor", "status_colorido", "veiculo_atual")
    list_filter = ("setor", "status")
    search_fields = ("numero", "setor")
    list_editable = ("setor",)
    ordering = ("setor", "numero")
    list_per_page = 50
    
    def status_colorido(self, obj):
        cores = {"LIVRE": "#28a745", "OCUPADA": "#dc3545", "RESERVADA": "#ffc107"}
        return format_html('<span style="background:{};color:#fff;padding:4px 10px;border-radius:12px;font-weight:bold">{}</span>', cores.get(obj.status, "#6c757d"), obj.status)
    status_colorido.short_description = "Status"
    
    def veiculo_atual(self, obj):
        v = obj.veiculos.filter(ativo=True).first()
        return f"{v.modelo} — {v.placa or 'Sem placa'}" if v else "—"
    veiculo_atual.short_description = "Veículo"

def liberar_vaga(modeladmin, request, queryset):
    n = 0
    for v in queryset:
        if v.pagamento == "PAGO" and v.ativo:
            v.pagamento = "LIBERADO"
            v.saida = timezone.now()
            v.ativo = False
            v.save()
            if v.vaga:
                v.vaga.status = "LIVRE"
                v.vaga.save()
                n += 1
    modeladmin.message_user(request, f"{n} vaga(s) liberada(s) e pagamento(s) confirmado(s).")
liberar_vaga.short_description = "✅ Confirmar pagamento e liberar vaga"

@admin.register(Veiculo)
class VeiculoAdmin(admin.ModelAdmin):
    list_display = ("placa", "modelo", "vaga", "entrada", "ativo", "pagamento_badge")
    list_filter = ("ativo", "pagamento", "vaga__setor")
    search_fields = ("placa", "modelo", "usuario__username")
    list_editable = ("ativo",)
    ordering = ("-entrada",)
    readonly_fields = ("entrada",)
    actions = [liberar_vaga]
    
    def pagamento_badge(self, obj):
        cor = {"SOLICITADO": "#f59e0b", "PAGO": "#3b82f6", "LIBERADO": "#28a745"}.get(obj.pagamento, "#6c757d")
        txt = obj.get_pagamento_display()
        return format_html('<span style="background:{};color:#fff;padding:3px 9px;border-radius:10px;font-size:.75rem;font-weight:bold">{}</span>', cor, txt)
    pagamento_badge.short_description = "Pagamento"

@admin.register(Movimento)
class MovimentoAdmin(admin.ModelAdmin):
    list_display = ("veiculo", "tipo", "horario")
    list_filter = ("tipo", "horario")
    search_fields = ("veiculo__placa",)
    ordering = ("-horario",)
    date_hierarchy = "horario"

@admin.register(AvisoVaga)
class AvisoVagaAdmin(admin.ModelAdmin):
    list_display = ("vaga", "status", "usuario", "criado_em")
    list_filter = ("status",)
    date_hierarchy = "criado_em"

@admin.register(ChatMsg)
class ChatMsgAdmin(admin.ModelAdmin):
    list_display = ("usuario", "texto_curto", "criado_em")
    date_hierarchy = "criado_em"
    
    def texto_curto(self, obj):
        return (obj.texto[:50] + "…") if len(obj.texto) > 50 else obj.texto

@admin.register(Ocorrencia)
class OcorrenciaAdmin(admin.ModelAdmin):
    list_display = ("id", "tipo", "status_colorido", "titulo", "usuario", "placa_veiculo", "vaga_numero", "criado_em")
    list_filter = ("tipo", "status", "criado_em")
    search_fields = ("titulo", "descricao", "placa_veiculo", "usuario__username", "vaga__numero")
    date_hierarchy = "criado_em"
    readonly_fields = ("criado_em", "atualizado_em")
    
    def status_colorido(self, obj):
        cores = {"PENDENTE": "#f59e0b", "EM_ANALISE": "#3b82f6", "RESOLVIDO": "#28a745"}
        return format_html('<span style="background:{};color:#fff;padding:3px 9px;border-radius:10px;font-size:.75rem;font-weight:bold">{}</span>', cores.get(obj.status, "#6c757d"), obj.get_status_display())
    status_colorido.short_description = "Status"
    
    def vaga_numero(self, obj):
        return f"Vaga {obj.vaga.numero} ({obj.vaga.setor})" if obj.vaga else "—"
    vaga_numero.short_description = "Vaga"

# Câmeras não são usadas: some do painel
try:
    if admin.site.is_registered(Camera):
        admin.site.unregister(Camera)
except Exception:
    pass

admin.site.site_header = "Sistema de Estacionamento"
admin.site.site_title = "Estacionamento Admin"
admin.site.index_title = "Painel de Controle"