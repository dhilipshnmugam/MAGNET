import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EntitySelectionLogin, { SelectionEntity } from '../components/auth/EntitySelectionLogin';
import toast from 'react-hot-toast';

export default function ClubLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const navigatedRef = useRef(false);

  const handleLogin = async (identifier: string, password: string, club: SelectionEntity) => {
    await login('', password, undefined, club.id, identifier);
    if (!navigatedRef.current) {
      navigatedRef.current = true;
      navigate('/clubs');
    }
  };

  return (
    <EntitySelectionLogin
      title="Club Portal"
      heading="Select Club"
      entityLabel="club"
      idCardLabel="Club ID / ID Card"
      searchPlaceholder="Search clubs..."
      icon={Users}
      accent="from-rose-500 to-pink-600"
      iconColor="text-rose-500"
      fetchItems={(search) =>
        import('../services').then(({ clubManagementService }) =>
          clubManagementService.list({ search: search || undefined, status: 'active', page_size: 100 }).then((res: any) =>
            (res.data.data || []).map((c: any) => ({ id: c.id, name: c.name, code: c.club_code }))
          )
        )
      }
      onSubmit={handleLogin}
    />
  );
}
