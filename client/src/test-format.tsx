import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

const TestFormat = () => {
  const testValues = [
    0,
    -0,
    1000,
    -1000,
    1999.99,
    10799,
    -10799,
    12345.67,
    -12345.67,
    -259521.92,
    1000000,
    1234567.89
  ];
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Prueba de formatCurrency</h1>
      <div className="bg-white p-4 rounded shadow">
        <table className="w-full">
          <thead>
            <tr>
              <th className="border p-2">Valor original</th>
              <th className="border p-2">Valor formateado</th>
            </tr>
          </thead>
          <tbody>
            {testValues.map((value, index) => (
              <tr key={index}>
                <td className="border p-2">{value}</td>
                <td className="border p-2">{formatCurrency(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TestFormat;