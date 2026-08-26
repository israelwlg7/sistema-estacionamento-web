# 🚗 Sistema de Estacionamento Web (Django)

Um sistema completo de gestão de estacionamentos desenvolvido em **Python** e **Django**, permitindo controle de vagas, entrada e saída de veículos, cálculo de permanência e tarifas, monitoramento de ocorrências e chat interno entre usuários e administração.

---

## 👥 Equipe & Colaboradores

Projeto desenvolvido colaborativamente pela equipe:

* 💻 **[Israel Shalon](https://github.com/israelwlg7)** (`@israelwlg7`)
* 💻 **[Allan](https://github.com/allandev-code)** (`@allandev-code`)
* 💻 **[Giulia](https://github.com/giulagg)** (`@giulagg`)
* 💻 **[Anderson](https://github.com/Anderson-361)** (`@Anderson-361`)
* 💻 **[William](https://github.com/wllslz)** (`@wllslz`)
* 💻 **José** *(Aguardando inclusão do perfil GitHub)*

---

## ✨ Funcionalidades

- 🅿️ **Controle de Vagas**: Visualização gráfica por setores (Livre, Ocupada, Reservada).
- 🚘 **Entrada e Saída de Veículos**: Registro de placas, modelo, cor, horários e atualização automática de status.
- 💳 **Gestão de Pagamentos**: Cálculo do valor de permanência e confirmação de pagamento.
- 📹 **Integração com Câmeras**: Cadastro e gerenciamento de câmeras de monitoramento.
- ⚠️ **Registro de Ocorrências**: Avarias, furtos, colisões e incidentes reportados pelos usuários.
- 💬 **Chat Interno**: Comunicação instantânea entre motoristas e operadores.

---

## 🛠️ Tecnologias Utilizadas

- **Linguagem**: Python 3.x
- **Framework Web**: Django 5.x
- **Banco de Dados**: SQLite / PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript, Templates Django
- **Configuração**: `python-decouple`

---

## 🚀 Como Executar o Projeto

### 1. Clonar o Repositório
```bash
git clone https://github.com/israelwlg7/sistema-estacionamento-web.git
cd sistema-estacionamento-web
```

### 2. Criar e Ativar o Ambiente Virtual
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / MacOS
python3 -m venv venv
source venv/bin/activate
```

### 3. Instalar as Dependências
```bash
pip install -r requirements.txt
```

### 4. Configurar as Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

### 5. Executar as Migrações do Banco de Dados
```bash
python manage.py migrate
```

### 6. Executar o Servidor de Desenvolvimento
```bash
python manage.py runserver
```

Acesse o sistema em seu navegador em `http://127.0.0.1:8000/`.

---

## 📄 Licença

Este projeto é de uso acadêmico e profissional, desenvolvido pelo grupo de desenvolvimento.
