/**
 * Módulo de API
 * Centraliza as requisições fetch e gerencia o CSRF Token do Django.
 */
const API = {
  // Pega o CSRF Token do cookie ou do DOM
  getCSRFToken() {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
    // Fallback para o input hidden do Django
    const inputToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    return cookieValue || inputToken || '';
  },

  // Lê o corpo da resposta e lança erro com a mensagem real do backend
  async _handle(response) {
    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      // corpo vazio ou não-JSON
    }

    if (!response.ok) {
      // Tenta pegar a mensagem amigável do backend
      const msg = (data && data.error) ? data.error : `Erro HTTP: ${response.status}`;
      throw new Error(msg);
    }

    return data;
  },

  // Requisição GET
  async get(url) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      return await this._handle(response);
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  },

  // Requisição POST
  async post(url, data) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken(),
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(data)
      });
      return await this._handle(response);
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  }
};