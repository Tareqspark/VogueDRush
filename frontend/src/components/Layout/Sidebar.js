import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  HomeIcon,
  ShoppingCartIcon,
  FireIcon,
  RectangleGroupIcon,
  BookOpenIcon,
  TruckIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  UserIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  CalendarDaysIcon,
  ArrowRightOnRectangleIcon,
  CubeIcon,
  ArchiveBoxIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  QrCodeIcon,
  GlobeAltIcon,
  PresentationChartLineIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
  BuildingLibraryIcon,
  MegaphoneIcon,
  StarIcon,
  DevicePhoneMobileIcon,
  FolderIcon,
  PhoneIcon,
  QueueListIcon,
  GiftIcon,
  IdentificationIcon,
  ExclamationCircleIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  BuildingOfficeIcon,
  CalculatorIcon,
  PauseCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const NAV_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { name: 'Dashboard',    href: '/',             icon: HomeIcon,            roles: ['admin', 'waiter', 'kitchen'] },
      { name: 'Orders',       href: '/orders',       icon: ShoppingCartIcon,    roles: ['admin', 'waiter'] },      { name: 'Hold Orders',   href: '/hold-orders',  icon: PauseCircleIcon,     roles: ['admin', 'waiter'] },
      { name: 'Cancelled',     href: '/cancelled-orders', icon: XCircleIcon,     roles: ['admin', 'waiter'] },
      { name: 'Collected',     href: '/collected-amount', icon: BanknotesIcon,   roles: ['admin'] },      { name: 'Kitchen',      href: '/kitchen',      icon: FireIcon,            roles: ['admin', 'waiter', 'kitchen'] },
      { name: 'Tables',       href: '/tables',       icon: RectangleGroupIcon,  roles: ['admin', 'waiter'] },
      { name: 'Reservations', href: '/reservations', icon: CalendarDaysIcon,    roles: ['admin', 'waiter'] },
      { name: 'Delivery',     href: '/delivery',     icon: TruckIcon,           roles: ['admin', 'waiter'] },
      { name: 'Change Log',   href: '/changelog',    icon: DocumentTextIcon,    roles: ['admin', 'waiter', 'kitchen'] },
      { name: 'QA Guide',     href: '/qa-guide',     icon: ClipboardDocumentListIcon, roles: ['admin', 'waiter', 'kitchen'] },
    ],
  },
  {
    label: 'Management',
    items: [
      { name: 'Menu',     href: '/menu',     icon: BookOpenIcon, roles: ['admin'] },
      { name: 'Users',    href: '/users',    icon: UsersIcon,    roles: ['admin'] },
      { name: 'Reports',  href: '/reports',  icon: ChartBarIcon, roles: ['admin'] },
      { name: 'Settings', href: '/settings', icon: CogIcon,      roles: ['admin'] },
    ],
  },
  {
    label: 'ERP Modules',
    items: [
      { name: 'Inventory',          href: '/inventory',             icon: CubeIcon,                    roles: ['admin'] },
      { name: 'Purchase',           href: '/purchase',              icon: ArchiveBoxIcon,              roles: ['admin'] },
      { name: 'Suppliers',          href: '/suppliers',             icon: BuildingStorefrontIcon,      roles: ['admin'] },
      { name: 'CRM & Loyalty',      href: '/crm',                   icon: UserGroupIcon,               roles: ['admin'] },
      { name: 'Expenses',           href: '/expenses',              icon: CurrencyDollarIcon,          roles: ['admin'] },
      { name: 'Accounting',         href: '/accounting',            icon: BanknotesIcon,               roles: ['admin'] },
      { name: 'HR & Payroll',       href: '/hr',                    icon: ClipboardDocumentCheckIcon,  roles: ['admin'] },
      { name: 'QR Ordering',        href: '/qr-ordering',           icon: QrCodeIcon,                  roles: ['admin'] },
      { name: 'Fleet',              href: '/fleet',                 icon: TruckIcon,                   roles: ['admin'] },
      { name: 'Reservations Pro',   href: '/advanced-reservations', icon: CalendarDaysIcon,            roles: ['admin'] },
      { name: 'Branches',           href: '/branches',              icon: GlobeAltIcon,                roles: ['admin'] },
      { name: 'Business Intel.',    href: '/bi',                    icon: PresentationChartLineIcon,   roles: ['admin'] },
    ],
  },
  {
    label: 'Enterprise Operations',
    items: [
      { name: 'Production',    href: '/production',    icon: CogIcon,                  roles: ['admin'] },
      { name: 'Food Costing',  href: '/food-costing',  icon: CalculatorIcon,           roles: ['admin'] },
      { name: 'Procurement',   href: '/procurement',   icon: ShoppingCartIcon,         roles: ['admin'] },
      { name: 'Assets',        href: '/assets',        icon: BuildingOfficeIcon,       roles: ['admin'] },
      { name: 'Maintenance',   href: '/maintenance',   icon: WrenchScrewdriverIcon,    roles: ['admin'] },
      { name: 'Catering',      href: '/catering',      icon: SparklesIcon,             roles: ['admin'] },
      { name: 'Banquet',       href: '/banquet',       icon: BuildingLibraryIcon,      roles: ['admin'] },
      { name: 'Marketing',     href: '/marketing',     icon: MegaphoneIcon,            roles: ['admin'] },
      { name: 'Reviews',       href: '/reviews',       icon: StarIcon,                 roles: ['admin'] },
      { name: 'Aggregator',    href: '/aggregator',    icon: DevicePhoneMobileIcon,    roles: ['admin'] },
      { name: 'Tax',           href: '/tax',           icon: DocumentTextIcon,         roles: ['admin'] },
      { name: 'Documents',     href: '/documents',     icon: FolderIcon,               roles: ['admin'] },
      { name: 'AI Forecasting',href: '/forecasting',   icon: ChartBarIcon,             roles: ['admin'] },
      { name: 'Call Center',   href: '/call-center',   icon: PhoneIcon,                roles: ['admin'] },
      { name: 'Queue',         href: '/queue',         icon: QueueListIcon,            roles: ['admin'] },
      { name: 'Gift Cards',    href: '/gift-cards',    icon: GiftIcon,                 roles: ['admin'] },
      { name: 'Membership',    href: '/membership',    icon: IdentificationIcon,       roles: ['admin'] },
      { name: 'Complaints',    href: '/complaints',    icon: ExclamationCircleIcon,    roles: ['admin'] },
      { name: 'Messaging',     href: '/messaging',     icon: ChatBubbleLeftRightIcon,  roles: ['admin'] },
      { name: 'Public API',    href: '/api-ecosystem', icon: CodeBracketIcon,          roles: ['admin'] },
    ],
  },
];

const ROLE_COLORS = {
  admin:   { bg: 'bg-sky-100',    text: 'text-sky-700' },
  waiter:  { bg: 'bg-amber-100',  text: 'text-amber-700' },
  kitchen: { bg: 'bg-emerald-100',text: 'text-emerald-700' },
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleColor = ROLE_COLORS[user?.role] || ROLE_COLORS.waiter;
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-sky-950/20 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside className={`sidebar flex flex-col ${isOpen ? 'translate-x-0 sidebar-open' : '-translate-x-full'} lg:translate-x-0`}>

        {/* ── Brand ── */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-sky-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm"
              style={{ background: 'linear-gradient(135deg, #0284C7, #EAB308)' }}>
              VD
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-none">Vogue D Rush</p>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">Management System</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden btn btn-ghost btn-icon">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-5">
          {NAV_SECTIONS.map(section => {
            const visible = section.items.filter(i => i.roles.includes(user?.role));
            if (!visible.length) return null;
            return (
              <div key={section.label}>
                <p className="section-title">{section.label}</p>
                <div className="space-y-0.5">
                  {visible.map(item => {
                    const active = location.pathname === item.href;
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        onClick={onClose}
                        className={`sidebar-item ${active ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                      >
                        <item.icon className={`h-4.5 w-4.5 flex-shrink-0 ${active ? 'text-sky-600' : 'text-slate-400'}`} style={{ height: '1.1rem', width: '1.1rem' }} />
                        <span>{item.name}</span>
                        {active && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-500" />
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* ── User card ── */}
        <div className="p-3 border-t border-sky-50">
          <NavLink to="/profile" onClick={onClose}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-sky-50 transition-colors group">
            <div className={`h-9 w-9 ${roleColor.bg} rounded-xl flex items-center justify-center font-bold text-sm ${roleColor.text} flex-shrink-0`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate leading-none">{user?.full_name}</p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${roleColor.bg} ${roleColor.text} uppercase tracking-wide`}>
                {user?.role}
              </span>
            </div>
            <UserIcon className="h-4 w-4 text-slate-300 group-hover:text-sky-500 transition-colors" />
          </NavLink>

          <button onClick={handleLogout}
            className="mt-1 flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;


