import { WarehouseTypes } from '@lightdash/common';
import { NumberInput, PasswordInput, Stack, TextInput } from '@mantine/core';
import React, { FC } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useToggle } from 'react-use';
import { hasNoWhiteSpaces } from '../../../utils/fieldValidators';
import FormSection from '../../ReactHookForm/FormSection';
import {
    AdvancedButton,
    AdvancedButtonWrapper,
} from '../ProjectConnection.styles';
import { useProjectFormContext } from '../ProjectFormProvider';
import StartOfWeekSelect from './Inputs/StartOfWeekSelect';

export const ClickHouseSchemaInput: FC<{
    disabled: boolean;
}> = ({ disabled }) => {
    const { register } = useFormContext();

    return (
        <TextInput
            label="Schema"
            description="This is the schema name."
            required
            {...register('warehouse.schema', {
                validate: {
                    hasNoWhiteSpaces: hasNoWhiteSpaces('Schema'),
                },
            })}
            disabled={disabled}
        />
    );
};

const ClickHouseForm: FC<{
    disabled: boolean;
}> = ({ disabled }) => {
    const [isOpen, toggleOpen] = useToggle(false);
    const { savedProject } = useProjectFormContext();
    const requireSecrets: boolean =
        savedProject?.warehouseConnection?.type !== WarehouseTypes.TRINO;
    const { register } = useFormContext();
    return (
        <>
            <Stack style={{ marginTop: '8px' }}>
                <TextInput
                    label="Host"
                    description="This is the host where the database is running."
                    required
                    {...register('warehouse.host', {
                        validate: {
                            hasNoWhiteSpaces: hasNoWhiteSpaces('Host'),
                        },
                    })}
                    disabled={disabled}
                    labelProps={{ style: { marginTop: '8px' } }}
                />
                <TextInput
                    label="User"
                    description="This is the database user name."
                    required={requireSecrets}
                    {...register('warehouse.user', {
                        validate: {
                            hasNoWhiteSpaces: hasNoWhiteSpaces('User'),
                        },
                    })}
                    placeholder={
                        disabled || !requireSecrets
                            ? '**************'
                            : undefined
                    }
                    disabled={disabled}
                />
                <PasswordInput
                    label="Password"
                    description="This is the database user password."
                    required={requireSecrets}
                    placeholder={
                        disabled || !requireSecrets
                            ? '**************'
                            : undefined
                    }
                    {...register('warehouse.password')}
                    disabled={disabled}
                />
                <TextInput
                    label="Database"
                    description="This is the database name."
                    required
                    {...register('warehouse.database', {
                        validate: {
                            hasNoWhiteSpaces: hasNoWhiteSpaces('Database'),
                        },
                    })}
                    disabled={disabled}
                />

                <FormSection isOpen={isOpen} name="advanced">
                    <Stack style={{ marginTop: '8px' }}>
                        <Controller
                            name="warehouse.port"
                            defaultValue={8123}
                            render={({ field }) => (
                                <NumberInput
                                    {...field}
                                    label="Port"
                                    description="This is the database port."
                                    required
                                    disabled={disabled}
                                />
                            )}
                        />
                        <StartOfWeekSelect disabled={disabled} />
                    </Stack>
                </FormSection>
                <AdvancedButtonWrapper>
                    <AdvancedButton
                        icon={isOpen ? 'chevron-up' : 'chevron-down'}
                        text={`Advanced configuration options`}
                        onClick={toggleOpen}
                    />
                </AdvancedButtonWrapper>
            </Stack>
        </>
    );
};

export default ClickHouseForm;
