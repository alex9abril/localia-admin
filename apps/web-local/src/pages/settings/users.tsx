import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { usersService, BusinessUser, User, BusinessRole } from '@/lib/users';
import { businessService } from '@/lib/business';

export default function UsersSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<BusinessUser & { business_name?: string }>>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<BusinessRole>('operativo_aceptador');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Obtener el negocio actual
        const business = await businessService.getMyBusiness();
        if (!business) {
          setError('No se encontró información de la tienda');
          return;
        }

        setBusinessId(business.id);

        // Cargar usuarios de la cuenta del superadmin (todas sus tiendas)
        const accountUsers = await usersService.getSuperadminAccountUsers();
        // Convertir a formato BusinessUser para compatibilidad
        const formattedUsers = accountUsers.map((u: any) => ({
          id: u.user_id,
          business_id: u.business_id,
          user_id: u.user_id,
          user_email: u.user_email,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          is_active: u.is_active,
          created_at: u.created_at,
          business_name: u.business_name,
        }));
        setUsers(formattedUsers);

        // Cargar usuarios disponibles para la cuenta del superadmin
        const available = await usersService.getAvailableUsersForSuperadminAccount();
        setAvailableUsers(available);
      } catch (err: any) {
        console.error('Error cargando usuarios:', err);
        setError('Error al cargar los usuarios');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSearch = async () => {
    try {
      const results = await usersService.getAvailableUsersForSuperadminAccount(searchTerm);
      setAvailableUsers(results);
    } catch (err: any) {
      console.error('Error buscando usuarios:', err);
      setError('Error al buscar usuarios');
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUser || !businessId) return;

    try {
      setError(null);
      // Asignar a la tienda actual (el superadmin puede elegir la tienda después)
      await usersService.assignUserToBusiness(businessId, {
        user_id: selectedUser.id,
        role: selectedRole,
      });

      // Recargar usuarios de la cuenta
      const accountUsers = await usersService.getSuperadminAccountUsers();
      const formattedUsers = accountUsers.map((u: any) => ({
        id: u.user_id,
        business_id: u.business_id,
        user_id: u.user_id,
        user_email: u.user_email,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        is_active: u.is_active,
        created_at: u.created_at,
        business_name: u.business_name,
      }));
      setUsers(formattedUsers);

      // Recargar usuarios disponibles
      const available = await usersService.getAvailableUsersForSuperadminAccount();
      setAvailableUsers(available);

      // Cerrar modal
      setShowAssignModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Error asignando usuario:', err);
      setError(err.message || 'Error al asignar usuario');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas remover este usuario de todas tus tiendas?')) {
      return;
    }

    try {
      setError(null);
      await usersService.removeUserFromSuperadminAccount(userId);

      // Recargar usuarios de la cuenta
      const accountUsers = await usersService.getSuperadminAccountUsers();
      const formattedUsers = accountUsers.map((u: any) => ({
        id: u.user_id,
        business_id: u.business_id,
        user_id: u.user_id,
        user_email: u.user_email,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        is_active: u.is_active,
        created_at: u.created_at,
        business_name: u.business_name,
      }));
      setUsers(formattedUsers);
    } catch (err: any) {
      console.error('Error removiendo usuario:', err);
      setError(err.message || 'Error al remover usuario');
    }
  };

  // Nota: handleChangeRole se removió porque ahora los usuarios pueden estar
  // en múltiples tiendas. Para cambiar un rol, se debe hacer desde la tienda específica.

  const getRoleLabel = (role: BusinessRole): string => {
    const labels: Record<BusinessRole, string> = {
      superadmin: 'Super Administrador',
      admin: 'Administrador',
      operativo_aceptador: 'Operativo Aceptador',
      operativo_cocina: 'Operativo Cocina',
    };
    return labels[role];
  };

  if (loading) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Usuarios y Permisos - LOCALIA Local</title>
      </Head>
      <LocalLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver a Configuración
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Usuarios y Permisos</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Administra a tus empleados y sus permisos de acceso
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Asignar Usuario
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Current Users */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Miembros del Personal</h2>
            
            {users.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios asignados</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Asigna usuarios a tus tiendas para comenzar a gestionar tu equipo.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name || user.last_name
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : 'Sin nombre'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.user_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.role === 'superadmin' ? 'Super Administrador' : getRoleLabel(user.role)}</div>
                          {user.business_name && (
                            <div className="text-xs text-gray-500 mt-1">Tienda: {user.business_name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {user.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleRemoveUser(user.user_id)}
                            className="text-red-600 hover:text-red-900"
                            disabled={user.role === 'superadmin'}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Assign User Modal */}
          {showAssignModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Asignar Usuario</h2>

                  {/* Search */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar Usuario
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Buscar por email, nombre o teléfono..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>

                  {/* Available Users List */}
                  <div className="mb-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                    {availableUsers.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No se encontraron usuarios</p>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {availableUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                              selectedUser?.id === user.id ? 'bg-indigo-50' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {user.first_name || user.last_name
                                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                    : 'Sin nombre'}
                                </p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                              {user.is_already_assigned && (
                                <div className="text-xs text-gray-500 mt-1">
                                  <div>Ya asignado</div>
                                  {user.assigned_businesses && user.assigned_businesses.length > 0 && (
                                    <div className="mt-1">
                                      {user.assigned_businesses.map((business, idx) => (
                                        <span key={idx} className="inline-block mr-2">
                                          {business} ({getRoleLabel(user.assigned_roles?.[idx] || 'operativo_aceptador')})
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Role Selection */}
                  {selectedUser && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rol
                      </label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as BusinessRole)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="admin">Administrador</option>
                        <option value="operativo_aceptador">Operativo Aceptador</option>
                        <option value="operativo_cocina">Operativo Cocina</option>
                      </select>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowAssignModal(false);
                        setSelectedUser(null);
                        setSearchTerm('');
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAssignUser}
                      disabled={!selectedUser}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Asignar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </LocalLayout>
    </>
  );
}

