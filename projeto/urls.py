from django.urls import path
from . import views

urlpatterns = [
    path('', views.login_view, name='login'),
    path('login/', views.login_view),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('mapa/', views.mapa, name='mapa'),
    path('assistente/', views.assistente, name='assistente'),
    path('registrar/', views.registrar_page, name='registrar'),
    path('perfil/', views.perfil, name='perfil'),
    path('config/', views.configuracoes, name='config'),
    
    # APIs
    path('api/vagas/', views.api_vagas, name='api_vagas'),
    path('api/veiculos/', views.api_veiculos, name='api_veiculos'),
    path('api/avisos/', views.api_avisos, name='api_avisos'),
    path('api/chat/', views.api_chat, name='api_chat'),
    path('api/entrada/', views.registrar_entrada, name='entrada'),
    path('api/saida/<int:veiculo_id>/', views.registrar_saida, name='saida'),
    path('api/aviso/', views.api_aviso, name='aviso'),
    path('api/checkout/solicitar/<int:veiculo_id>/', views.api_checkout_solicitar, name='ck_solicitar'),
    path('api/checkout/pagar/<int:veiculo_id>/', views.api_checkout_pagar, name='ck_pagar'),
    
    # Outras páginas
    path('suporte/', views.suporte, name='suporte'),
    path('perfil/excluir/', views.excluir_conta, name='excluir_conta'),
]