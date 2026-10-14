import React from 'react';
import { Switch as HeadlessSwitch } from '@headlessui/react';

export function Switch({ checked, onChange, label, description, disabled = false }) {
  return (
    <HeadlessSwitch.Group as="div" className="flex items-center justify-between py-1">
      {(label || description) && (
        <span className="flex flex-col mr-4">
          {label && <HeadlessSwitch.Label className="text-sm font-medium text-main cursor-pointer">{label}</HeadlessSwitch.Label>}
          {description && <HeadlessSwitch.Description className="text-xs text-muted mt-0.5">{description}</HeadlessSwitch.Description>}
        </span>
      )}
      <HeadlessSwitch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`${
          checked ? 'bg-primary' : 'bg-surface-2 border border-line'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span
          className={`${
            checked ? 'translate-x-5 bg-primary-contrast' : 'translate-x-0 bg-muted/60'
          } pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out m-0.5`}
        />
      </HeadlessSwitch>
    </HeadlessSwitch.Group>
  );
}
