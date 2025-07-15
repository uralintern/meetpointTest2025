import React, { useState } from 'react';
import { saveEventData } from '../api/events';

const EventSetupSummary = () => {
    const [errorMessage, setErrorMessage] = useState('');

    const handleSave = async () => {
        try {
            await saveEventData(data);
        } catch (error: any) {
            console.error('Ошибка при отправке данных:', error);

            let details = error?.response?.data?.message 
                || error?.message 
                || error?.toString() 
                || 'Нет подробностей';

            setErrorMessage(`Ошибка при отправке данных: Детали: ${details}`);
        }
    };

    return (
        <div>
            {errorMessage && <div className="error-message">{errorMessage}</div>}
        </div>
    );
};

export default EventSetupSummary;