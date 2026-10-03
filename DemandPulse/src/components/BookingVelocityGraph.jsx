import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const BookingVelocityGraph = ({ historical, recent }) => {
    // Generate some mock data around the historical/recent values to make it look like a trend
    const data = [
        { name: 'T-4h', velocity: historical * 0.95 },
        { name: 'T-3h', velocity: historical * 1.05 },
        { name: 'T-2h', velocity: historical * 1.0 },
        { name: 'T-1h', velocity: (historical + recent) / 2 },
        { name: 'Recent', velocity: recent },
    ];

    return (
        <div className="velocity-chart-container" style={{ width: '100%', height: 150, marginTop: '20px' }}>
            <h4 style={{ fontSize: '0.8rem', color: '#718096', marginBottom: '10px', textTransform: 'uppercase' }}>Booking Velocity Trend</h4>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="name"
                        hide
                    />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', fontSize: '12px' }}
                        labelStyle={{ display: 'none' }}
                    />
                    <ReferenceLine y={historical} stroke="#cbd5e0" strokeDasharray="3 3" label={{ position: 'right', value: 'Avg', fill: '#cbd5e0', fontSize: 10 }} />
                    <Line
                        type="monotone"
                        dataKey="velocity"
                        stroke="#3182ce"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#3182ce' }}
                        activeDot={{ r: 6 }}
                        animationDuration={1500}
                    />
                </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3182ce' }}></span>
                <span style={{ fontSize: '0.7rem', color: '#718096', fontWeight: '600' }}>Acceleration Indicator: {recent > historical ? '🚀 Increasing' : 'Stable'}</span>
            </div>
        </div>
    );
};

export default BookingVelocityGraph;
