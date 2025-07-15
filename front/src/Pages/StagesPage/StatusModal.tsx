import React, { useEffect, useState } from 'react';
import { Modal, Button, Dropdown, Menu, Typography } from 'antd';
import { StatusApp } from 'Features/ApiSlices/statusAppSlice';
import CloseIcon from 'assets/icons/close.svg?react';

const { Title } = Typography;

const DEFAULT_OPTION = { key: '', label: 'Выберите статус', className: '', style: { background: 'transparent', color: '#333', border: '1px solid #d9d9d9' } };
const STATUS_OPTIONS = [
  DEFAULT_OPTION,
  { key: 'positive', label: 'Принят', className: 'radio-option radio-positive', style: { background: '#52c41a', color: '#fff' } },
  { key: 'negative', label: 'Отказано', className: 'radio-option radio-negative', style: { background: '#ff4d4f', color: '#fff' } },
  { key: 'pending', label: 'В рассмотрении', className: 'radio-option radio-pending', style: { background: '#1890ff', color: '#fff' } },
];

interface StatusModalProps {
  visible: boolean;
  onCancel: () => void;
  onAddStatus: (status: StatusApp) => void;
  onUpdateStatus?: (status: StatusApp) => void;
  editingStatus?: StatusApp | null;
}

/**
 * Модальное окно для добавления и редактирования статусов заявок.
 * Позволяет задавать название, описание и тип статуса (положительный/отрицательный).
 * Поддерживает режимы создания нового статуса и редактирования существующего.
 * 
 * @component
 * @example
 * // Пример использования для добавления статуса:
 * <StatusModal
 *   visible={isModalVisible}
 *   onCancel={() => setIsModalVisible(false)}
 *   onAddStatus={handleAddStatus}
 * />
 * 
 * // Пример использования для редактирования статуса:
 * <StatusModal
 *   visible={isModalVisible}
 *   onCancel={() => setIsModalVisible(false)}
 *   onUpdateStatus={handleUpdateStatus}
 *   editingStatus={selectedStatus}
 * />
 *
 * @param {Object} props - Пропсы компонента.
 * @param {boolean} props.visible - Флаг видимости модального окна
 * @param {function} props.onCancel - Коллбэк закрытия модального окна
 * @param {function} props.onAddStatus - Коллбэк добавления нового статуса
 * @param {function} [props.onUpdateStatus] - Коллбэк обновления существующего статуса
 * @param {StatusApp | null} [props.editingStatus] - Редактируемый статус (null при создании)
 *
 * @returns {JSX.Element} Модальное окно с формой редактирования статуса
 */
export default function StatusModal({
  visible,
  onCancel,
  onAddStatus,
  onUpdateStatus,
  editingStatus
}: StatusModalProps): JSX.Element {
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    if (!visible) {
      setSelectedType('');
    }
  }, [visible]);

  useEffect(() => {
    if (editingStatus && visible) {
      setSelectedType(editingStatus.type || '');
    }
  }, [editingStatus, visible]);

  const handleSelect = ({ key }: { key: string }) => {
    setSelectedType(key);
  };

  const handleSubmit = () => {
    if (!selectedType) return;
    const option = STATUS_OPTIONS.find(opt => opt.key === selectedType);
    const statusData: StatusApp = {
        id: editingStatus?.id || Date.now(),
        name: option?.label || '',
        type: selectedType as 'positive' | 'negative' | 'pending',
        is_positive: selectedType === 'positive' || selectedType === 'pending',
    };
    if (editingStatus && onUpdateStatus) {
        onUpdateStatus(statusData);
    } else {
        onAddStatus(statusData);
    }
    onCancel();
  };

  const menu = (
    <Menu onClick={handleSelect}>
      {STATUS_OPTIONS.slice(1).map(opt => (
        <Menu.Item key={opt.key} className={opt.className} style={opt.style}>
          {opt.label}
        </Menu.Item>
      ))}
    </Menu>
  );

  const currentOption = STATUS_OPTIONS.find(opt => opt.key === selectedType) || DEFAULT_OPTION;

  return (
    <Modal
      title={
        <Title level={4} className="ModalTitle">
          {editingStatus ? 'Редактирование статуса' : 'Добавление статуса'}
        </Title>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      className='ModalFormContainer'
      closeIcon={<CloseIcon width={24} height={24} strokeWidth={1} />}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Отмена
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          {editingStatus ? 'Сохранить' : 'Создать'}
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Dropdown overlay={menu} trigger={["click"]}>
          <Button style={currentOption.style}>
            {currentOption.label}
          </Button>
        </Dropdown>
      </div>
    </Modal>
  );
};