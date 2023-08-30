class WebSocketService {
    constructor() {
      this.socket = null;
    }
  
    connect(address, onMessage) {
      this.socket = new WebSocket(address);
  
      this.socket.addEventListener('open', () => {
        console.log('WebSocket connected');
      });
  
      this.socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        onMessage(message);
      });
  
      this.socket.addEventListener('close', (event) => {
        console.log('WebSocket disconnected', event);
        this.socket = null;
      });
    }
  
    disconnect() {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
    }
  }
  
  export default new WebSocketService();
  