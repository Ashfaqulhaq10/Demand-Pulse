import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ForecastChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    return (
        <div style={{
            marginTop: '20px',
            height: '200px',
            background: 'rgba(0, 0, 0, 0.7)', // Darker background
            borderRadius: '12px',
            padding: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
            <h4 style={{
                margin: '0 0 10px 0',
                fontSize: '0.9rem',
                color: '#ffffff',
                textAlign: 'left'
            }}>5-Day Trend Forecast</h4>

            <div style={{ width: '100%', height: 'calc(100% - 30px)' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" vertical={false} />
                        <XAxis
                            dataKey="day"
                            stroke="#ffffff"
                            fontSize={12}
                            tick={{ fill: '#ffffff' }}
                            axisLine={{ stroke: '#ffffff' }}
                            tickLine={false}
                        />
                        <YAxis hide domain={['dataMin - 0.2', 'dataMax + 0.2']} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#2d3748', border: 'none', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value) => [value.toFixed(2), "Demand Score"]}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#3182ce"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#3182ce', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ForecastChart;

