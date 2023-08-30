import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import WebSocketService from './services/WebSocketService';

ReactDOM.render(<App />, document.getElementById('root'));

// Connect to WebSocket server
WebSocketService.connect('ws://localhost:3001', (message) => {
  // Handle incoming message from WebSocket
  console.log('Received message from WebSocket:', message);
});
