import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const NetworkGrid = ({ count = 300, color = '#38a169', speedMultiplier = 1.0 }) => {
    const mesh = useRef();
    const { viewport } = useThree();

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 25;
            const y = (Math.random() - 0.5) * 25;
            const z = (Math.random() - 0.5) * 10;
            const vx = (Math.random() - 0.5) * 0.015;
            const vy = (Math.random() - 0.5) * 0.015;
            temp.push({ x, y, z, vx, vy, ox: x, oy: y, oz: z });
        }
        return temp;
    }, [count]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        particles.forEach((particle, i) => {
            particle.x += particle.vx * speedMultiplier;
            particle.y += particle.vy * speedMultiplier;

            if (Math.abs(particle.x - particle.ox) > 4) particle.vx *= -1;
            if (Math.abs(particle.y - particle.oy) > 4) particle.vy *= -1;

            dummy.position.set(particle.x, particle.y, particle.z);
            const scale = 0.5 + Math.sin(time + i) * 0.2;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            mesh.current.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[null, null, count]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
        </instancedMesh>
    );
};

const HolographicGrid = ({ color }) => {
    const gridRef = useRef();
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (gridRef.current) {
            gridRef.current.position.y = -4 + Math.sin(t * 0.3) * 0.2;
            gridRef.current.rotation.x = -Math.PI / 2.5 + Math.sin(t * 0.1) * 0.05;
        }
    });

    return (
        <group ref={gridRef}>
            <gridHelper args={[60, 40, color, color]} transparent opacity={0.15} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[60, 60]} />
                <meshBasicMaterial color={color} transparent opacity={0.02} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
};

const DataShards = ({ count = 20, color }) => {
    const groupRef = useRef();
    const shards = useMemo(() => {
        return Array.from({ length: count }, () => ({
            pos: [
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 15 - 5
            ],
            rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
            speed: 0.2 + Math.random() * 0.5,
            size: 0.1 + Math.random() * 0.3
        }));
    }, [count]);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        groupRef.current.children.forEach((child, i) => {
            const shard = shards[i];
            child.rotation.x += 0.01 * shard.speed;
            child.rotation.y += 0.01 * shard.speed;
            child.position.y += Math.sin(t * shard.speed + i) * 0.005;
        });
    });

    return (
        <group ref={groupRef}>
            {shards.map((shard, i) => (
                <mesh key={i} position={shard.pos} rotation={shard.rot}>
                    <octahedronGeometry args={[shard.size]} />
                    <meshPhongMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.3} wireframe />
                </mesh>
            ))}
        </group>
    );
};

const DataCore = ({ color }) => {
    const coreRef = useRef();
    const innerRef = useRef();
    const outerRef = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (coreRef.current) {
            coreRef.current.position.y = Math.sin(t * 0.5) * 0.3;
        }
        if (innerRef.current) {
            innerRef.current.rotation.x = t * 0.5;
            innerRef.current.rotation.y = t * 0.3;
        }
        if (outerRef.current) {
            outerRef.current.rotation.x = -t * 0.2;
            outerRef.current.rotation.z = t * 0.4;
        }
    });

    return (
        <group ref={coreRef} position={[0, 1, -4]}>
            <mesh ref={innerRef}>
                <sphereGeometry args={[1.2, 32, 32]} />
                <meshPhongMaterial color={color} emissive={color} emissiveIntensity={1} transparent opacity={0.15} />
            </mesh>
            <mesh ref={outerRef}>
                <icosahedronGeometry args={[2, 1]} />
                <meshBasicMaterial color={color} wireframe transparent opacity={0.2} />
            </mesh>
            <pointLight distance={15} intensity={4} color={color} />
        </group>
    );
};

const SceneContent = ({ demandLevel, color, speed }) => {
    const groupRef = useRef();
    const { mouse, viewport } = useThree();

    useFrame(() => {
        if (groupRef.current) {
            // Parallax effect
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, (mouse.x * Math.PI) / 20, 0.05);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -(mouse.y * Math.PI) / 20, 0.05);
        }
    });

    return (
        <group ref={groupRef}>
            <NetworkGrid count={400} color={color} speedMultiplier={speed} />
            <HolographicGrid color={color} />
            <DataShards count={30} color={color} />
            <DataCore color={color} />

            {demandLevel === 'VERY HIGH' && (
                <group>
                    <mesh position={[0, 1, -4]}>
                        <ringGeometry args={[2.5, 2.6, 64]} />
                        <meshBasicMaterial color={color} transparent opacity={0.3} />
                    </mesh>
                    <mesh position={[0, 1, -4]} rotation={[Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[3, 3.1, 64]} />
                        <meshBasicMaterial color={color} transparent opacity={0.2} />
                    </mesh>
                </group>
            )}
        </group>
    );
};

const DashboardMode = ({ color }) => {
    const meshRef = useRef();
    const { viewport } = useThree();

    const nodes = useMemo(() => {
        return Array.from({ length: 150 }, () => ({
            pos: [(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 10 - 5],
            speed: 0.1 + Math.random() * 0.2
        }));
    }, []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.z = t * 0.05;
        meshRef.current.rotation.y = Math.sin(t * 0.1) * 0.1;
    });

    return (
        <group ref={meshRef}>
            <NetworkGrid count={200} color={color} speedMultiplier={0.3} />
            <mesh rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -5, -10]}>
                <gridHelper args={[100, 50, color, color]} transparent opacity={0.05} />
            </mesh>
            <pointLight position={[0, 5, 5]} intensity={0.5} color={color} />
        </group>
    );
};

const ThreeBackground = ({ demandLevel }) => {
    const config = useMemo(() => {
        const levels = {
            'LOW': { color: '#0ea5e9', speed: 1.0 },
            'NORMAL': { color: '#22c55e', speed: 1.2 },
            'HIGH': { color: '#f59e0b', speed: 1.8 },
            'VERY HIGH': { color: '#ef4444', speed: 2.5 }
        };
        return levels[demandLevel] || levels['LOW'];
    }, [demandLevel]);

    return (
        <div className="three-bg">
            <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
                <color attach="background" args={['#020617']} />
                <fog attach="fog" args={['#020617', 5, 30]} />
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 10, 10]} intensity={1} color={config.color} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#1e293b" />

                <SceneContent demandLevel={demandLevel} color={config.color} speed={config.speed} />
            </Canvas>
        </div>
    );
};

export default ThreeBackground;
