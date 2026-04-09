-- =============================================================================
-- Seed Data: Dominican Republic Geographic Hierarchy + Sample Electoral Data
-- =============================================================================
-- This file populates the PEMOS database with:
--   1. All 32 Dominican Republic provinces (with JCE codes)
--   2. Municipalities for all provinces
--   3. One complete hierarchy path down to nivel_intermedio for testing
--   4. Sample partido and cargo records
--
-- Run via: supabase db reset (applies migrations then seeds)
-- =============================================================================

-- =============================================================================
-- PROVINCES (32 Provincias of the Dominican Republic)
-- =============================================================================
-- JCE codes are the official codes assigned by the Junta Central Electoral.
-- =============================================================================

INSERT INTO provincias (nombre, codigo) VALUES
    ('Distrito Nacional', '01'),
    ('Azua', '02'),
    ('Baoruco', '03'),
    ('Barahona', '04'),
    ('Dajabon', '05'),
    ('Duarte', '06'),
    ('Elias Pina', '07'),
    ('El Seibo', '08'),
    ('Espaillat', '09'),
    ('Hato Mayor', '10'),
    ('Hermanas Mirabal', '11'),
    ('Independencia', '12'),
    ('La Altagracia', '13'),
    ('La Romana', '14'),
    ('La Vega', '15'),
    ('Maria Trinidad Sanchez', '16'),
    ('Monsenor Nouel', '17'),
    ('Monte Cristi', '18'),
    ('Monte Plata', '19'),
    ('Pedernales', '20'),
    ('Peravia', '21'),
    ('Puerto Plata', '22'),
    ('Samana', '23'),
    ('San Cristobal', '24'),
    ('San Jose de Ocoa', '25'),
    ('San Juan', '26'),
    ('San Pedro de Macoris', '27'),
    ('Sanchez Ramirez', '28'),
    ('Santiago', '29'),
    ('Santiago Rodriguez', '30'),
    ('Santo Domingo', '31'),
    ('Valverde', '32');

-- =============================================================================
-- MUNICIPALITIES (Municipios)
-- =============================================================================
-- Representative municipalities for all 32 provinces.
-- Uses subqueries to resolve provincia_id by codigo.
-- =============================================================================

-- Distrito Nacional (01)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '01'), 'Santo Domingo de Guzman', '0101');

-- Azua (02)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '02'), 'Azua de Compostela', '0201'),
    ((SELECT id FROM provincias WHERE codigo = '02'), 'Estebania', '0202'),
    ((SELECT id FROM provincias WHERE codigo = '02'), 'Guayabal', '0203'),
    ((SELECT id FROM provincias WHERE codigo = '02'), 'Las Charcas', '0204'),
    ((SELECT id FROM provincias WHERE codigo = '02'), 'Las Yayas de Viajama', '0205'),
    ((SELECT id FROM provincias WHERE codigo = '02'), 'Padre Las Casas', '0206'),
    ((SELECT id FROM provincias WHERE codigo = '02'), 'Peralta', '0207'),
    ((SELECT id FROM provincias WHERE codigo = '02'), 'Pueblo Viejo', '0208'),
    ((SELECT id FROM provincias WHERE codigo = '02'), 'Sabana Yegua', '0209'),
    ((SELECT id FROM provincias WHERE codigo = '02'), 'Tabara Arriba', '0210');

-- Baoruco (03)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '03'), 'Neiba', '0301'),
    ((SELECT id FROM provincias WHERE codigo = '03'), 'Galvan', '0302'),
    ((SELECT id FROM provincias WHERE codigo = '03'), 'Los Rios', '0303'),
    ((SELECT id FROM provincias WHERE codigo = '03'), 'Tamayo', '0304'),
    ((SELECT id FROM provincias WHERE codigo = '03'), 'Villa Jaragua', '0305');

-- Barahona (04)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '04'), 'Santa Cruz de Barahona', '0401'),
    ((SELECT id FROM provincias WHERE codigo = '04'), 'Cabral', '0402'),
    ((SELECT id FROM provincias WHERE codigo = '04'), 'El Penon', '0403'),
    ((SELECT id FROM provincias WHERE codigo = '04'), 'Enriquillo', '0404'),
    ((SELECT id FROM provincias WHERE codigo = '04'), 'Fundacion', '0405'),
    ((SELECT id FROM provincias WHERE codigo = '04'), 'Jaquimeyes', '0406'),
    ((SELECT id FROM provincias WHERE codigo = '04'), 'La Cienaga', '0407'),
    ((SELECT id FROM provincias WHERE codigo = '04'), 'Las Salinas', '0408'),
    ((SELECT id FROM provincias WHERE codigo = '04'), 'Paraiso', '0409'),
    ((SELECT id FROM provincias WHERE codigo = '04'), 'Polo', '0410'),
    ((SELECT id FROM provincias WHERE codigo = '04'), 'Vicente Noble', '0411');

-- Dajabon (05)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '05'), 'Dajabon', '0501'),
    ((SELECT id FROM provincias WHERE codigo = '05'), 'El Pino', '0502'),
    ((SELECT id FROM provincias WHERE codigo = '05'), 'Loma de Cabrera', '0503'),
    ((SELECT id FROM provincias WHERE codigo = '05'), 'Partido', '0504'),
    ((SELECT id FROM provincias WHERE codigo = '05'), 'Restauracion', '0505');

-- Duarte (06)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '06'), 'San Francisco de Macoris', '0601'),
    ((SELECT id FROM provincias WHERE codigo = '06'), 'Arenoso', '0602'),
    ((SELECT id FROM provincias WHERE codigo = '06'), 'Castillo', '0603'),
    ((SELECT id FROM provincias WHERE codigo = '06'), 'Eugenio Maria de Hostos', '0604'),
    ((SELECT id FROM provincias WHERE codigo = '06'), 'Las Guaranas', '0605'),
    ((SELECT id FROM provincias WHERE codigo = '06'), 'Pimentel', '0606'),
    ((SELECT id FROM provincias WHERE codigo = '06'), 'Villa Riva', '0607');

-- Elias Pina (07)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '07'), 'Comendador', '0701'),
    ((SELECT id FROM provincias WHERE codigo = '07'), 'Banica', '0702'),
    ((SELECT id FROM provincias WHERE codigo = '07'), 'El Llano', '0703'),
    ((SELECT id FROM provincias WHERE codigo = '07'), 'Hondo Valle', '0704'),
    ((SELECT id FROM provincias WHERE codigo = '07'), 'Juan Santiago', '0705'),
    ((SELECT id FROM provincias WHERE codigo = '07'), 'Pedro Santana', '0706');

-- El Seibo (08)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '08'), 'El Seibo', '0801'),
    ((SELECT id FROM provincias WHERE codigo = '08'), 'Miches', '0802');

-- Espaillat (09)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '09'), 'Moca', '0901'),
    ((SELECT id FROM provincias WHERE codigo = '09'), 'Cayetano Germosen', '0902'),
    ((SELECT id FROM provincias WHERE codigo = '09'), 'Gaspar Hernandez', '0903'),
    ((SELECT id FROM provincias WHERE codigo = '09'), 'Jamao al Norte', '0904');

-- Hato Mayor (10)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '10'), 'Hato Mayor del Rey', '1001'),
    ((SELECT id FROM provincias WHERE codigo = '10'), 'El Valle', '1002'),
    ((SELECT id FROM provincias WHERE codigo = '10'), 'Sabana de la Mar', '1003');

-- Hermanas Mirabal (11)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '11'), 'Salcedo', '1101'),
    ((SELECT id FROM provincias WHERE codigo = '11'), 'Tenares', '1102'),
    ((SELECT id FROM provincias WHERE codigo = '11'), 'Villa Tapia', '1103');

-- Independencia (12)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '12'), 'Jimani', '1201'),
    ((SELECT id FROM provincias WHERE codigo = '12'), 'Cristobal', '1202'),
    ((SELECT id FROM provincias WHERE codigo = '12'), 'Duverge', '1203'),
    ((SELECT id FROM provincias WHERE codigo = '12'), 'La Descubierta', '1204'),
    ((SELECT id FROM provincias WHERE codigo = '12'), 'Mella', '1205'),
    ((SELECT id FROM provincias WHERE codigo = '12'), 'Postrer Rio', '1206');

-- La Altagracia (13)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '13'), 'Higuey', '1301'),
    ((SELECT id FROM provincias WHERE codigo = '13'), 'San Rafael del Yuma', '1302');

-- La Romana (14)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '14'), 'La Romana', '1401'),
    ((SELECT id FROM provincias WHERE codigo = '14'), 'Guaymate', '1402'),
    ((SELECT id FROM provincias WHERE codigo = '14'), 'Villa Hermosa', '1403');

-- La Vega (15)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '15'), 'La Concepcion de la Vega', '1501'),
    ((SELECT id FROM provincias WHERE codigo = '15'), 'Constanza', '1502'),
    ((SELECT id FROM provincias WHERE codigo = '15'), 'Jarabacoa', '1503'),
    ((SELECT id FROM provincias WHERE codigo = '15'), 'Jima Abajo', '1504');

-- Maria Trinidad Sanchez (16)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '16'), 'Nagua', '1601'),
    ((SELECT id FROM provincias WHERE codigo = '16'), 'Cabrera', '1602'),
    ((SELECT id FROM provincias WHERE codigo = '16'), 'El Factor', '1603'),
    ((SELECT id FROM provincias WHERE codigo = '16'), 'Rio San Juan', '1604');

-- Monsenor Nouel (17)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '17'), 'Bonao', '1701'),
    ((SELECT id FROM provincias WHERE codigo = '17'), 'Maimon', '1702'),
    ((SELECT id FROM provincias WHERE codigo = '17'), 'Piedra Blanca', '1703');

-- Monte Cristi (18)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '18'), 'Monte Cristi', '1801'),
    ((SELECT id FROM provincias WHERE codigo = '18'), 'Castanuelas', '1802'),
    ((SELECT id FROM provincias WHERE codigo = '18'), 'Guayubin', '1803'),
    ((SELECT id FROM provincias WHERE codigo = '18'), 'Las Matas de Santa Cruz', '1804'),
    ((SELECT id FROM provincias WHERE codigo = '18'), 'Pepillo Salcedo', '1805'),
    ((SELECT id FROM provincias WHERE codigo = '18'), 'Villa Vasquez', '1806');

-- Monte Plata (19)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '19'), 'Monte Plata', '1901'),
    ((SELECT id FROM provincias WHERE codigo = '19'), 'Bayaguana', '1902'),
    ((SELECT id FROM provincias WHERE codigo = '19'), 'Peralvillo', '1903'),
    ((SELECT id FROM provincias WHERE codigo = '19'), 'Sabana Grande de Boya', '1904'),
    ((SELECT id FROM provincias WHERE codigo = '19'), 'Yamasa', '1905');

-- Pedernales (20)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '20'), 'Pedernales', '2001'),
    ((SELECT id FROM provincias WHERE codigo = '20'), 'Oviedo', '2002');

-- Peravia (21)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '21'), 'Bani', '2101'),
    ((SELECT id FROM provincias WHERE codigo = '21'), 'Nizao', '2102');

-- Puerto Plata (22)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '22'), 'San Felipe de Puerto Plata', '2201'),
    ((SELECT id FROM provincias WHERE codigo = '22'), 'Altamira', '2202'),
    ((SELECT id FROM provincias WHERE codigo = '22'), 'Guananico', '2203'),
    ((SELECT id FROM provincias WHERE codigo = '22'), 'Imbert', '2204'),
    ((SELECT id FROM provincias WHERE codigo = '22'), 'Los Hidalgos', '2205'),
    ((SELECT id FROM provincias WHERE codigo = '22'), 'Luperon', '2206'),
    ((SELECT id FROM provincias WHERE codigo = '22'), 'Sosua', '2207'),
    ((SELECT id FROM provincias WHERE codigo = '22'), 'Villa Isabela', '2208'),
    ((SELECT id FROM provincias WHERE codigo = '22'), 'Villa Montellano', '2209');

-- Samana (23)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '23'), 'Santa Barbara de Samana', '2301'),
    ((SELECT id FROM provincias WHERE codigo = '23'), 'Las Terrenas', '2302'),
    ((SELECT id FROM provincias WHERE codigo = '23'), 'Sanchez', '2303');

-- San Cristobal (24)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '24'), 'San Cristobal', '2401'),
    ((SELECT id FROM provincias WHERE codigo = '24'), 'Bajos de Haina', '2402'),
    ((SELECT id FROM provincias WHERE codigo = '24'), 'Cambita Garabitos', '2403'),
    ((SELECT id FROM provincias WHERE codigo = '24'), 'Los Cacaos', '2404'),
    ((SELECT id FROM provincias WHERE codigo = '24'), 'Sabana Grande de Palenque', '2405'),
    ((SELECT id FROM provincias WHERE codigo = '24'), 'San Gregorio de Nigua', '2406'),
    ((SELECT id FROM provincias WHERE codigo = '24'), 'Villa Altagracia', '2407'),
    ((SELECT id FROM provincias WHERE codigo = '24'), 'Yaguate', '2408');

-- San Jose de Ocoa (25)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '25'), 'San Jose de Ocoa', '2501'),
    ((SELECT id FROM provincias WHERE codigo = '25'), 'Rancho Arriba', '2502'),
    ((SELECT id FROM provincias WHERE codigo = '25'), 'Sabana Larga', '2503');

-- San Juan (26)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '26'), 'San Juan de la Maguana', '2601'),
    ((SELECT id FROM provincias WHERE codigo = '26'), 'Bohechio', '2602'),
    ((SELECT id FROM provincias WHERE codigo = '26'), 'El Cercado', '2603'),
    ((SELECT id FROM provincias WHERE codigo = '26'), 'Juan de Herrera', '2604'),
    ((SELECT id FROM provincias WHERE codigo = '26'), 'Las Matas de Farfan', '2605'),
    ((SELECT id FROM provincias WHERE codigo = '26'), 'Vallejuelo', '2606');

-- San Pedro de Macoris (27)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '27'), 'San Pedro de Macoris', '2701'),
    ((SELECT id FROM provincias WHERE codigo = '27'), 'Consuelo', '2702'),
    ((SELECT id FROM provincias WHERE codigo = '27'), 'Guayacanes', '2703'),
    ((SELECT id FROM provincias WHERE codigo = '27'), 'Quisqueya', '2704'),
    ((SELECT id FROM provincias WHERE codigo = '27'), 'Ramon Santana', '2705'),
    ((SELECT id FROM provincias WHERE codigo = '27'), 'San Jose de Los Llanos', '2706');

-- Sanchez Ramirez (28)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '28'), 'Cotui', '2801'),
    ((SELECT id FROM provincias WHERE codigo = '28'), 'Cevicos', '2802'),
    ((SELECT id FROM provincias WHERE codigo = '28'), 'Fantino', '2803'),
    ((SELECT id FROM provincias WHERE codigo = '28'), 'La Mata', '2804');

-- Santiago (29)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '29'), 'Santiago de los Caballeros', '2901'),
    ((SELECT id FROM provincias WHERE codigo = '29'), 'Bisono', '2902'),
    ((SELECT id FROM provincias WHERE codigo = '29'), 'Janico', '2903'),
    ((SELECT id FROM provincias WHERE codigo = '29'), 'Licey al Medio', '2904'),
    ((SELECT id FROM provincias WHERE codigo = '29'), 'Punal', '2905'),
    ((SELECT id FROM provincias WHERE codigo = '29'), 'Sabana Iglesia', '2906'),
    ((SELECT id FROM provincias WHERE codigo = '29'), 'San Jose de las Matas', '2907'),
    ((SELECT id FROM provincias WHERE codigo = '29'), 'Tamboril', '2908'),
    ((SELECT id FROM provincias WHERE codigo = '29'), 'Villa Gonzalez', '2909');

-- Santiago Rodriguez (30)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '30'), 'San Ignacio de Sabaneta', '3001'),
    ((SELECT id FROM provincias WHERE codigo = '30'), 'Moncion', '3002');

-- Santo Domingo (31)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '31'), 'Santo Domingo Este', '3101'),
    ((SELECT id FROM provincias WHERE codigo = '31'), 'Santo Domingo Norte', '3102'),
    ((SELECT id FROM provincias WHERE codigo = '31'), 'Santo Domingo Oeste', '3103'),
    ((SELECT id FROM provincias WHERE codigo = '31'), 'Boca Chica', '3104'),
    ((SELECT id FROM provincias WHERE codigo = '31'), 'Los Alcarrizos', '3105'),
    ((SELECT id FROM provincias WHERE codigo = '31'), 'Pedro Brand', '3106'),
    ((SELECT id FROM provincias WHERE codigo = '31'), 'San Antonio de Guerra', '3107');

-- Valverde (32)
INSERT INTO municipios (provincia_id, nombre, codigo) VALUES
    ((SELECT id FROM provincias WHERE codigo = '32'), 'Mao', '3201'),
    ((SELECT id FROM provincias WHERE codigo = '32'), 'Esperanza', '3202'),
    ((SELECT id FROM provincias WHERE codigo = '32'), 'Laguna Salada', '3203');

-- =============================================================================
-- COMPLETE HIERARCHY PATH: Santo Domingo Province
-- =============================================================================
-- One full path from provincia down to nivel_intermedio for development
-- and testing purposes.
-- =============================================================================

-- Circunscripcion in Santo Domingo Este
INSERT INTO circunscripciones (municipio_id, nombre, numero) VALUES
    ((SELECT id FROM municipios WHERE codigo = '3101'), 'Circunscripcion 1 - Santo Domingo Este', 1),
    ((SELECT id FROM municipios WHERE codigo = '3101'), 'Circunscripcion 2 - Santo Domingo Este', 2),
    ((SELECT id FROM municipios WHERE codigo = '3101'), 'Circunscripcion 3 - Santo Domingo Este', 3);

-- Circunscripcion in Distrito Nacional
INSERT INTO circunscripciones (municipio_id, nombre, numero) VALUES
    ((SELECT id FROM municipios WHERE codigo = '0101'), 'Circunscripcion 1 - Distrito Nacional', 1),
    ((SELECT id FROM municipios WHERE codigo = '0101'), 'Circunscripcion 2 - Distrito Nacional', 2);

-- Circunscripcion in Santiago
INSERT INTO circunscripciones (municipio_id, nombre, numero) VALUES
    ((SELECT id FROM municipios WHERE codigo = '2901'), 'Circunscripcion 1 - Santiago', 1),
    ((SELECT id FROM municipios WHERE codigo = '2901'), 'Circunscripcion 2 - Santiago', 2);

-- Sectores in Circunscripcion 1 of Santo Domingo Este
INSERT INTO sectores (circunscripcion_id, nombre, codigo) VALUES
    ((SELECT id FROM circunscripciones WHERE nombre = 'Circunscripcion 1 - Santo Domingo Este'), 'Los Mina', 'S001'),
    ((SELECT id FROM circunscripciones WHERE nombre = 'Circunscripcion 1 - Santo Domingo Este'), 'Villa Duarte', 'S002'),
    ((SELECT id FROM circunscripciones WHERE nombre = 'Circunscripcion 1 - Santo Domingo Este'), 'Alma Rosa', 'S003');

-- Comites in Los Mina sector
INSERT INTO comites (sector_id, nombre, codigo) VALUES
    ((SELECT id FROM sectores WHERE codigo = 'S001'), 'Comite Los Mina Norte', 'C001'),
    ((SELECT id FROM sectores WHERE codigo = 'S001'), 'Comite Los Mina Sur', 'C002');

-- Niveles intermedios in Comite Los Mina Norte
INSERT INTO niveles_intermedios (comite_id, nombre, codigo) VALUES
    ((SELECT id FROM comites WHERE codigo = 'C001'), 'Nivel Intermedio 1 - Los Mina Norte', 'NI001'),
    ((SELECT id FROM comites WHERE codigo = 'C001'), 'Nivel Intermedio 2 - Los Mina Norte', 'NI002');

-- =============================================================================
-- SAMPLE ELECTORAL DATA
-- =============================================================================

-- Political Parties
INSERT INTO partidos (nombre, siglas, color) VALUES
    ('Partido Revolucionario Moderno', 'PRM', '#0066CC'),
    ('Partido de la Liberacion Dominicana', 'PLD', '#800080'),
    ('Partido Reformista Social Cristiano', 'PRSC', '#FF0000'),
    ('Fuerza del Pueblo', 'FP', '#008000'),
    ('Partido Revolucionario Dominicano', 'PRD', '#FFFFFF');

-- Electoral Positions (Cargos)
INSERT INTO cargos (nombre, descripcion, nivel) VALUES
    ('Presidente', 'Presidente de la Republica', 'nacional'),
    ('Vicepresidente', 'Vicepresidente de la Republica', 'nacional'),
    ('Senador', 'Senador de la Republica', 'provincial'),
    ('Diputado', 'Diputado al Congreso Nacional', 'provincial'),
    ('Alcalde', 'Alcalde Municipal', 'municipal'),
    ('Regidor', 'Regidor Municipal', 'municipal'),
    ('Director de Distrito Municipal', 'Director de Distrito Municipal', 'municipal'),
    ('Vocal', 'Vocal del Distrito Municipal', 'municipal');

-- Sample Recinto in Santo Domingo Este
INSERT INTO recintos (nombre, codigo, direccion, municipio_id, circunscripcion_id) VALUES
    ('Escuela Basica Los Mina', 'R001', 'Calle Principal, Los Mina, Santo Domingo Este',
     (SELECT id FROM municipios WHERE codigo = '3101'),
     (SELECT id FROM circunscripciones WHERE nombre = 'Circunscripcion 1 - Santo Domingo Este')),
    ('Liceo Secundario Villa Duarte', 'R002', 'Av. Venezuela, Villa Duarte, Santo Domingo Este',
     (SELECT id FROM municipios WHERE codigo = '3101'),
     (SELECT id FROM circunscripciones WHERE nombre = 'Circunscripcion 1 - Santo Domingo Este'));

-- =============================================================================
-- REFRESH MATERIALIZED VIEWS
-- =============================================================================
-- After seeding, refresh all materialized views so they contain accurate data.
-- =============================================================================
SELECT refresh_materialized_views();
