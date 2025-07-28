'use client';

import { DashboardLayout } from '@/shared/components/layout';
import { RequireAuth } from '@/shared/components/protection';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <DashboardLayout>{children}</DashboardLayout>
    </RequireAuth>
  );
}