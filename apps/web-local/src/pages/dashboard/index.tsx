import Head from 'next/head';
import LocalLayout from '@/components/layout/LocalLayout';

export default function DashboardPage() {
  return (
    <>
      <Head>
        <title>Dashboard - LOCALIA Local</title>
      </Head>
      <LocalLayout>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
          <p className="text-gray-600">Bienvenido a tu panel de control de LOCALIA Local.</p>
        </div>
      </LocalLayout>
    </>
  );
}

