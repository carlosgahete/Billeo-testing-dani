import React, { useState } from 'react';

const SimpleExpenseForm = () => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('description', description.trim());
    formData.append('amount', String(amount).replace(',', '.').trim());
    formData.append('date', new Date(date).toISOString());
    if (attachment) {
      formData.append('attachment', attachment);
    }

    // Mostrar el contenido del FormData
    formData.forEach((value, key) => {
      console.log(`${key}:`, value);
    });

    const response = await fetch('/api/expenses', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      console.log('Gasto registrado correctamente.');
      // Limpiar el formulario si quieres
      setDescription('');
      setAmount('');
      setDate('');
      setAttachment(null);
    } else {
      console.error('Error al registrar el gasto:', await response.text());
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
      <input
        type="text"
        placeholder="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Cantidad"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => setAttachment(e.target.files?.[0] || null)}
      />
      <button type="submit">Registrar gasto</button>
    </form>
  );
};

export default SimpleExpenseForm;