import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Modal } from './Modal';
import styles from './Modal.module.css';

describe('Modal', () => {
  afterEach(() => {
    cleanup();
  });

  describe('when modal is closed', () => {
    test('does not display any content', () => {
      render(
        <Modal isOpen={false} onClose={rs.fn()} title="Test Modal">
          <div>Modal Content</div>
        </Modal>
      );

      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
      expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
    });
  });

  describe('when modal is open', () => {
    test('displays the title', () => {
      render(
        <Modal isOpen={true} onClose={rs.fn()} title="Test Modal">
          <div>Modal Content</div>
        </Modal>
      );

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    test('displays the content', () => {
      render(
        <Modal isOpen={true} onClose={rs.fn()} title="Test Modal">
          <div>Modal Content</div>
        </Modal>
      );

      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    test('user can close modal by clicking overlay', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <div>Modal Content</div>
        </Modal>
      );

      const overlay = screen.getByText('Modal Content').parentElement?.parentElement;
      if (overlay) {
        await user.click(overlay);
        expect(onClose).toHaveBeenCalled();
      }
    });

    test('user can close modal by pressing Escape key', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <div>Modal Content</div>
        </Modal>
      );

      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalled();
    });

    test('clicking modal content does not close the modal', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <div>Modal Content</div>
        </Modal>
      );

      await user.click(screen.getByText('Modal Content'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('when modal close is disabled', () => {
    test('user cannot close modal by clicking overlay', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal" closeDisabled={true}>
          <div>Modal Content</div>
        </Modal>
      );

      const overlay = screen.getByText('Modal Content').parentElement?.parentElement;
      if (overlay) {
        await user.click(overlay);
        expect(onClose).not.toHaveBeenCalled();
      }
    });

    test('user cannot close modal by pressing Escape key', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal" closeDisabled={true}>
          <div>Modal Content</div>
        </Modal>
      );

      await user.keyboard('{Escape}');
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('modal sizes', () => {
    test('applies small size class when specified', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={rs.fn()} title="Small Modal" size="small">
          <div>Content</div>
        </Modal>
      );

      const modalContent = container.querySelector(`.${styles.small}`);
      expect(modalContent).toBeInTheDocument();
    });

    test('applies medium size class by default', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={rs.fn()} title="Medium Modal">
          <div>Content</div>
        </Modal>
      );

      const modalContent = container.querySelector(`.${styles.medium}`);
      expect(modalContent).toBeInTheDocument();
    });

    test('applies large size class when specified', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={rs.fn()} title="Large Modal" size="large">
          <div>Content</div>
        </Modal>
      );

      const modalContent = container.querySelector(`.${styles.large}`);
      expect(modalContent).toBeInTheDocument();
    });
  });
});
