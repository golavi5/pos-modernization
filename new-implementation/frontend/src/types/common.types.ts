export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  children?: NavigationItem[];
  badge?: string | number;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  current?: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface ModalProps extends DialogProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export interface FormFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
}

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  onPageChange?: (page: number) => void;
  onSort?: (column: string, order: 'asc' | 'desc') => void;
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  success?: boolean;
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
}

export interface DateRange {
  from: Date;
  to: Date;
}
