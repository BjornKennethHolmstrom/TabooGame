// tests/__mocks__/@/components/ui/index.js
export const AlertDialog = ({ children }) => <div data-testid="alert-dialog">{children}</div>;
export const AlertDialogAction = ({ children }) => <button data-testid="alert-action">{children}</button>;
export const AlertDialogContent = ({ children }) => <div data-testid="alert-content">{children}</div>;
export const AlertDialogDescription = ({ children }) => <div data-testid="alert-desc">{children}</div>;
export const AlertDialogFooter = ({ children }) => <div data-testid="alert-footer">{children}</div>;
export const AlertDialogHeader = ({ children }) => <div data-testid="alert-header">{children}</div>;
export const AlertDialogTitle = ({ children }) => <div data-testid="alert-title">{children}</div>;
export const Card = ({ children, className }) => <div data-testid="card" className={className}>{children}</div>;
export const CardContent = ({ children }) => <div data-testid="card-content">{children}</div>;
export const CardHeader = ({ children }) => <div data-testid="card-header">{children}</div>;
export const CardTitle = ({ children }) => <div data-testid="card-title">{children}</div>;
