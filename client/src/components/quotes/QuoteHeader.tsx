import React from 'react';
import { Loader2, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuoteHeaderProps {
  title: string;
  subtitle: string;
  isEdit: boolean;
  logoPreview: string | null;
  isUploading: boolean;
  onSelectFile: () => void;
}

export const QuoteHeader: React.FC<QuoteHeaderProps> = ({
  title,
  subtitle,
  isEdit,
  logoPreview,
  isUploading,
  onSelectFile
}) => {
  return (
    <div className="mb-6 mt-2">
      <div className="flex items-center mb-4">
        <div className="bg-[#FFF6F0] p-3 rounded-full mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#FF9500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800 tracking-tight leading-none">
            {title}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5 leading-tight">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-14">
        {logoPreview && (
          <div className="relative h-10 w-10 rounded-full overflow-hidden border shadow-sm">
            <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain bg-white" />
          </div>
        )}
        <Button 
          type="button"
          className="button-apple h-9"
          size="sm"
          onClick={onSelectFile}
          disabled={isUploading}
        >
          {isUploading ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Subiendo...
            </span>
          ) : (
            <>
              <Image className="mr-2 h-4 w-4" />
              {logoPreview ? "Cambiar logo" : "Subir logo"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default QuoteHeader;