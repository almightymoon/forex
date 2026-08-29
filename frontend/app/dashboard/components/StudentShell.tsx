'use client';

import '../../admin/components/admin.css';
import './student.css';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import DarkModeToggle from '../../../components/DarkModeToggle';
import DeveloperRoleNav from '../../../components/DeveloperRoleNav';
import UserProfileDropdown from '../../components/UserProfileDropdown';
import NotificationDropdown from './NotificationDropdown';
import {
  STUDENT_NAV_GROUPS,
  getStudentNavGroup,
  getStudentNavItem,
  type StudentTabId,
} from '../config/nav';

type ShellUser = React.ComponentProps<typeof UserProfileDropdown>['user'];

type Props = {
  activeTab: StudentTabId;
  onTabChange: (tab: StudentTabId) => void;
  platformName?: string;
  user: ShellUser;
  notificationCount?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
};

export default function StudentShell({
  activeTab,
  onTabChange,
  platformName = 'Forex Navigators',
  user,
  notificationCount = 0,
  refreshing = false,
  onRefresh,
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickNav, setShowQuickNav] = useState(false);
  const [navQuery, setNavQuery] = useState('');

  const current = useMemo(() => getStudentNavItem(activeTab), [activeTab]);
  const currentGroup = useMemo(() => getStudentNavGroup(activeTab), [activeTab]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowQuickNav(true);
      }
      if (event.key === 'Escape') setShowQuickNav(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const quickNavItems = useMemo(() => {
    const query = navQuery.trim().toLowerCase();
    return STUDENT_NAV_GROUPS.flatMap((group) =>
      group.items
        .filter(
          (item) =>
            !query ||
            `${item.label} ${item.description || ''} ${group.label}`.toLowerCase().includes(query)
        )
        .map((item) => ({ ...item, group: group.label }))
    );
  }, [navQuery]);

  const openTab = (tab: StudentTabId) => {
    onTabChange(tab);
    setShowQuickNav(false);
    setNavQuery('');
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('studentSidebarCollapsed');
      if (stored === '1') setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('studentSidebarCollapsed', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  const sidebarWidth = collapsed ? 'w-[4.5rem]' : 'w-[15.5rem]';

  return (
    <div className="admin-shell student-shell">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {showQuickNav ? (
        <div className="admin-modal-overlay !items-start !pt-[12vh]">
          <button
            type="button"
            className="admin-modal-overlay__backdrop"
            aria-label="Close quick navigation"
            onClick={() => setShowQuickNav(false)}
          />
          <div role="dialog" aria-modal="true" className="admin-modal admin-modal--lg !max-w-xl !p-0">
            <div className="flex items-center gap-3 border-b border-[var(--admin-border)] px-4">
              <Search className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                id="student-quick-nav"
                autoFocus
                value={navQuery}
                onChange={(event) => setNavQuery(event.target.value)}
                placeholder="Jump to courses, signals, community..."
                className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none"
                aria-label="Jump to a student area"
              />
              <kbd className="hidden rounded border border-[var(--admin-border)] px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block">
                ESC
              </kbd>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-2">
              {quickNavItems.length ? (
                quickNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openTab(item.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--admin-accent-soft)]"
                    >
                      <span className="admin-stat-card__icon admin-stat-card--sky !h-9 !w-9 !rounded-lg">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span className="block truncate text-xs text-[var(--admin-muted)]">
                          {item.description || item.group}
                        </span>
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {item.group}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-8 text-center text-sm text-[var(--admin-muted)]">
                  No areas match “{navQuery}”.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-[width,transform] duration-200 lg:translate-x-0 ${sidebarWidth} ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative flex h-[4.25rem] shrink-0 items-center border-b border-[var(--admin-border)] px-3">
          <div className={`admin-sidebar__brand w-full ${collapsed ? 'justify-center' : 'pr-9 lg:pr-0'}`}>
            <div className="admin-sidebar__logo">
              <Sparkles className="h-[1.125rem] w-[1.125rem]" />
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="admin-sidebar__title">Trading Desk</p>
                <p className="admin-sidebar__subtitle truncate">{platformName}</p>
              </div>
            ) : null}
          </div>
          {!collapsed ? (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="admin-icon-btn absolute right-2 top-1/2 z-10 -translate-y-1/2 lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <nav className="admin-sidebar-nav flex-1 overflow-y-auto px-2 py-3">
          {STUDENT_NAV_GROUPS.map((group) => (
            <div key={group.id} className="mb-4 last:mb-0">
              {!collapsed ? <p className="admin-nav-group-label">{group.label}</p> : <div className="mb-2" />}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        title={collapsed ? item.label : undefined}
                        onClick={() => onTabChange(item.id)}
                        className={`admin-nav-item ${active ? 'is-active' : ''} ${collapsed ? '!justify-center !px-2' : ''}`}
                      >
                        <span className="admin-nav-item__icon">
                          <Icon className="h-4 w-4" />
                        </span>
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar__footer hidden lg:block">
          <button type="button" onClick={toggleCollapsed} className="admin-sidebar__collapse">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed ? <span>Collapse sidebar</span> : null}
          </button>
        </div>
      </aside>

      <div
        className={`admin-workspace transition-[padding] duration-200 ${
          collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-[15.5rem]'
        }`}
      >
        <header className="admin-topbar">
          <div className="admin-topbar__inner">
            <div className="admin-topbar__start">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="admin-icon-btn admin-topbar__menu-btn lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="admin-breadcrumb admin-breadcrumb--desktop min-w-0">
                <div className="admin-breadcrumb__trail">
                  <span>Student</span>
                  <span>/</span>
                  <span>{currentGroup?.label || 'Workspace'}</span>
                  <span>/</span>
                  <span>{current?.label || 'Dashboard'}</span>
                </div>
                <p className="admin-breadcrumb__title truncate">{current?.label || 'Dashboard'}</p>
                {current?.description ? (
                  <p className="admin-breadcrumb__desc truncate">{current.description}</p>
                ) : null}
              </div>
              <p className="admin-topbar__mobile-title" title={current?.label || 'Dashboard'}>
                {current?.label || 'Dashboard'}
              </p>
            </div>

            <div className="hidden shrink-0 md:block">
              <DeveloperRoleNav />
            </div>

            <div className="admin-topbar__tools">
              <button
                type="button"
                onClick={() => setShowQuickNav(true)}
                className="admin-jump-btn"
                title="Jump to an area (Ctrl or Command + K)"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="rounded border border-[var(--admin-border)] px-1 text-[10px]">⌘K</kbd>
              </button>

              <div className="admin-topbar__tool-group">
                <DarkModeToggle size="sm" />
                {onRefresh ? (
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="admin-icon-btn admin-topbar__refresh disabled:opacity-50"
                    title="Refresh data"
                  >
                    <RefreshCw className={`h-[1.125rem] w-[1.125rem] ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                ) : null}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotifications((v) => !v)}
                    className="admin-icon-btn"
                    aria-label="Notifications"
                  >
                    <Bell className="h-[1.125rem] w-[1.125rem]" />
                    {notificationCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </span>
                    ) : null}
                  </button>
                  <NotificationDropdown
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                    onRefresh={onRefresh}
                  />
                </div>
              </div>

              <div className="admin-topbar__profile-wrap">
                <UserProfileDropdown user={user} />
              </div>
            </div>
          </div>
          <div className="border-t border-[var(--admin-border)] px-4 py-2 md:hidden">
            <DeveloperRoleNav />
          </div>
        </header>

        <main className="admin-main">
          <div className="admin-main__canvas">{children}</div>
        </main>
      </div>
    </div>
  );
}
