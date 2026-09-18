import React from 'react';
import { CompanySettings } from '../types';
import { UsersManagementModal } from './UsersManagementModal';
import { getCompanySettings } from '../utils/storage';

interface AdminCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: CompanySettings;
  onSuccess: (updatedSettings: CompanySettings) => void;
}

export const AdminCredentialsModal: React.FC<AdminCredentialsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSuccess,
}) => {
  return (
    <UsersManagementModal
      isOpen={isOpen}
      onClose={onClose}
      companySettings={currentSettings}
      onSuccess={() => {
        onSuccess(getCompanySettings());
      }}
    />
  );
};
