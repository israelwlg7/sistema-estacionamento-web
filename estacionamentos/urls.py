from django.contrib import admin
from django.urls import path, include
from projeto import views as projeto_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('projeto.urls')),
]

# Páginas de erro customizadas (views já existentes no projeto)
handler400 = projeto_views.custom_400
handler403 = projeto_views.custom_403
handler404 = projeto_views.custom_404
handler429 = projeto_views.custom_429