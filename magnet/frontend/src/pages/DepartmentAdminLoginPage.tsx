import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EntitySelectionLogin, { SelectionEntity } from '../components/auth/EntitySelectionLogin';
import toast from 'react-hot-toast';

export default function DepartmentAdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const navigatedRef = useRef(false);

  const handleLogin = async (identifier: string, password: string, dept: SelectionEntity) => {
    await login('', password, dept.id, undefined, identifier);
    if (!navigatedRef.current) {
      navigatedRef.current = true;
      navigate('/department-admin');
    }
  };

  return (
    <EntitySelectionLogin
      title="Department Portal"
      heading="Select Department"
      entityLabel="department"
      idCardLabel="Department ID / ID Card"
      searchPlaceholder="Search departments..."
      icon={BookOpen}
      accent="from-emerald-500 to-teal-600"
      iconColor="text-emerald-500"
      fetchItems={(search) =>
        import('../services').then(({ departmentService }) =>
          departmentService.list({ search: search || undefined, status: 'active', page_size: 100 }).then((res: any) =>
            (res.data.data || []).map((d: any) => ({ id: d.id, name: d.name, code: d.code }))
          )
        )
      }
      onSubmit={handleLogin}
    />
  );
}
