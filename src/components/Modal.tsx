import { MouseEvent, ReactNode } from 'react';

interface Props {
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ wide, onClose, children }: Props) {
  function handleBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className="modal" onClick={handleBackdrop}>
      <div className={`modal-card${wide ? ' wide' : ''}`}>{children}</div>
    </div>
  );
}
