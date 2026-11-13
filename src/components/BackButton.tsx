import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BackButton = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className="flex items-center gap-2 font-nunito text-[14px] text-interlan-text-secondary hover:text-foreground transition-colors mb-4"
    >
      <ArrowLeft size={16} />
      Regresar
    </button>
  );
};

export default BackButton;
