import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FiX } from 'react-icons/fi';

export function Modal({ isOpen, onClose, title, description, children, maxWidth = 'max-w-lg', className = '' }) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                className={`w-full ${maxWidth} transform overflow-hidden rounded-t-2xl sm:rounded-token bg-surface p-6 text-left align-middle shadow-2xl transition-all border border-line ${className}`}
              >
                <div className="flex items-start justify-between pb-3 border-b border-line mb-4">
                  <div>
                    {title && (
                      <Dialog.Title as="h3" className="text-lg font-semibold text-main tracking-tight">
                        {title}
                      </Dialog.Title>
                    )}
                    {description && (
                      <Dialog.Description className="text-xs sm:text-sm text-muted mt-0.5">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="p-1 text-muted hover:text-main rounded-token hover:bg-surface-2 transition-colors ml-3"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
