/**
 * Módulo de Autenticação (Frontend)
 * Lida com interações de UI relacionadas ao usuário logado.
 */
const Auth = {
    init() {
        this.setupLogoutButton();
        this.checkSession();
    },

    setupLogoutButton() {
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                // O Django já cuida do logout via URL, 
                // mas podemos adicionar uma confirmação ou animação aqui.
                if (!confirm('Tem certeza que deseja sair?')) {
                    e.preventDefault();
                }
            });
        }
    },

    checkSession() {
        // Se precisarmos de verificações assíncronas de token no futuro
        // Por enquanto, o Django gerencia via Session Cookie.
        console.log('Auth module initialized.');
    }
};