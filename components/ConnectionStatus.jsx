import React from 'react';
import { Wifi, WifiOff, AlertCircle, Loader } from 'lucide-react';

const ConnectionStatus = ({ status }) => {
  const getStatusDisplay = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-4 h-4 text-green-500" />,
          text: 'Connected',
          className: 'bg-green-50 text-green-700 border-green-200'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-4 h-4 text-red-500" />,
          text: 'Disconnected',
          className: 'bg-red-50 text-red-700 border-red-200'
        };
      case 'reconnecting':
        return {
          icon: <Loader className="w-4 h-4 text-yellow-500 animate-spin" />,
          text: 'Reconnecting...',
          className: 'bg-yellow-50 text-yellow-700 border-yellow-200'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: 'Connection Error',
          className: 'bg-red-50 text-red-700 border-red-200'
        };
      default:
        return {
          icon: <Loader className="w-4 h-4 text-gray-500 animate-spin" />,
          text: 'Connecting...',
          className: 'bg-gray-50 text-gray-700 border-gray-200'
        };
    }
  };

  const { icon, text, className } = getStatusDisplay();

  return (
    <div 
      className={`fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full border ${className} shadow-sm`}
      data-testid="connection-status"
    >
      {icon}
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
};

export default ConnectionStatus;
