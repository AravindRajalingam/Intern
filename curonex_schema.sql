-- =========================================================
-- CURONEX — PostgreSQL Schema
-- Transcribed directly from handwritten schema notes.
--
-- ASSUMPTIONS MADE (nothing in the notes specified these,
-- so placeholder values were chosen purely to make the SQL
-- valid — no table/field from the notes was altered):
--   1. Enum VALUES (status types etc.) were not written in
--      the notes, only the field name + "(enum)". Reasonable
--      placeholder values are used below; change freely.
--   2. "order.item_id (FK)" and "items.order_id (FK)" form a
--      circular reference in the notes. To make this valid
--      SQL, items.order_id is created first (normal 1-to-many:
--      one order -> many items), and order.item_id is added
--      afterwards via ALTER TABLE.
--   3. DOCTOR was noted as "unique [id, hosp_id]" (a doctor
--      can be tied to multiple hospitals), so DOCTOR's primary
--      key is the composite (id, hosp_id). Since other tables
--      reference "doctor_id" alone, a plain UNIQUE(id) was
--      added on DOCTOR so those single-column foreign keys are
--      valid in Postgres (a FK target must be unique).
--   4. "id (FK)" columns in DETAILS, USER, HOSPITALS, PHARMACY,
--      DELIVERY_PARTNER, DOCTOR are treated as 1-to-1 extension
--      keys: same value is both that table's PK and a FK back
--      to CREDENTIALS(.id) or DETAILS(.id) per the notes' layout.
-- =========================================================

BEGIN;

-- =========================================================
-- ENUM TYPES  (values are placeholders — see assumption #1)
-- =========================================================
CREATE TYPE pharmacy_status_enum AS ENUM ('active','inactive','suspended');
CREATE TYPE delivery_partner_status_enum AS ENUM ('available','on_delivery','offline');
CREATE TYPE order_status_enum AS ENUM ('pending','confirmed','out_for_delivery','delivered','cancelled');
CREATE TYPE appointment_status_enum AS ENUM ('pending','confirmed','completed','cancelled');
CREATE TYPE ambulance_status_enum AS ENUM ('available','on_trip','maintenance');
CREATE TYPE camp_followup_enum AS ENUM ('Yes','No');
CREATE TYPE resource_category_enum AS ENUM ('medicine','equipment','consumable','other');
CREATE TYPE resource_availability_enum AS ENUM ('available','low_stock','out_of_stock');
CREATE TYPE transfer_status_enum AS ENUM ('pending','in_transit','completed','cancelled');

-- =========================================================
-- CREDENTIALS  (base login/account table)
-- =========================================================
CREATE TABLE credentials (
    id            SERIAL PRIMARY KEY,
    password      VARCHAR(255) NOT NULL,   -- hashed
    username      VARCHAR(100) NOT NULL UNIQUE
);

-- =========================================================
-- DETAILS  (id is both PK and FK -> credentials.id)
-- =========================================================
CREATE TABLE details (
    id            INT PRIMARY KEY REFERENCES credentials(id) ON DELETE CASCADE,
    name          VARCHAR(150),
    email         VARCHAR(150),
    phone         VARCHAR(20),
    address       TEXT,
    pincode       VARCHAR(10),
    city          VARCHAR(100),
    state         VARCHAR(100)
);

-- =========================================================
-- "user"  (id is both PK and FK -> details.id)
-- quoted because USER is a reserved word in PostgreSQL
-- =========================================================
CREATE TABLE "user" (
    id            INT PRIMARY KEY REFERENCES details(id) ON DELETE CASCADE,
    gender        VARCHAR(20),
    dob           DATE,
    blood_group   VARCHAR(5)
);

-- =========================================================
-- HOSPITALS  (id is both PK and FK -> credentials.id)
-- =========================================================
CREATE TABLE hospitals (
    id                  INT PRIMARY KEY REFERENCES credentials(id) ON DELETE CASCADE,
    licence_no          VARCHAR(100),
    geo_address         TEXT,
    total_icu_beds      INT,
    available_icu_beds  INT,
    facilities          TEXT[],
    total_doctors       INT
);

-- =========================================================
-- PHARMACY  (id is both PK and FK -> credentials.id)
-- =========================================================
CREATE TABLE pharmacy (
    id            INT PRIMARY KEY REFERENCES credentials(id) ON DELETE CASCADE,
    licence_no    VARCHAR(100),
    geo_address   TEXT,
    status        pharmacy_status_enum,
    hosp_id       INT REFERENCES hospitals(id) ON DELETE SET NULL   -- null if not associated to hospital
);

-- =========================================================
-- DELIVERY PARTNER  (id is both PK and FK -> credentials.id)
-- =========================================================
CREATE TABLE delivery_partner (
    id              INT PRIMARY KEY REFERENCES credentials(id) ON DELETE CASCADE,
    vehicle_number  VARCHAR(20),
    status          delivery_partner_status_enum,
    licence_no      VARCHAR(100)
);

-- =========================================================
-- DOCTOR  (composite PK per note "unique [id, hosp_id]";
-- UNIQUE(id) added so other tables can FK to doctor_id alone
-- — see assumption #3)
-- =========================================================
CREATE TABLE doctor (
    id              INT NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
    license_no      VARCHAR(100),
    experience      INT,
    specialization  VARCHAR(100),
    hosp_id         INT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    start_time      TIME[],
    end_time        TIME[],
    timings         JSONB,   -- [[start_time, end_time], [...]]
    PRIMARY KEY (id, hosp_id),
    UNIQUE (id)
);

-- =========================================================
-- MEDICINE
-- =========================================================
CREATE TABLE medicine (
    medicine_id   SERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL
);

-- =========================================================
-- "order"  (item_id FK added later — see assumption #2)
-- quoted because ORDER is a reserved keyword in PostgreSQL
-- =========================================================
CREATE TABLE "order" (
    order_id             SERIAL PRIMARY KEY,
    pharmacy_id          INT REFERENCES pharmacy(id),
    delivery_partner_id  INT REFERENCES delivery_partner(id),
    user_id              INT REFERENCES "user"(id),
    status               order_status_enum,
    item_id              INT,   -- FK constraint added below after ITEMS exists
    order_datetime        TIMESTAMP
);

-- =========================================================
-- ITEMS
-- =========================================================
CREATE TABLE items (
    item_id       SERIAL PRIMARY KEY,
    order_id      INT REFERENCES "order"(order_id) ON DELETE CASCADE,
    medicine_id   INT REFERENCES medicine(medicine_id)
);

-- circular reference completed (see assumption #2)
ALTER TABLE "order"
    ADD CONSTRAINT fk_order_item
    FOREIGN KEY (item_id) REFERENCES items(item_id);

-- =========================================================
-- PRESCRIPTION
-- =========================================================
CREATE TABLE prescription (
    prescription_id       SERIAL PRIMARY KEY,
    user_id               INT REFERENCES "user"(id),
    hospital_id            INT REFERENCES hospitals(id),
    medicines              JSONB,   -- {item: qty}
    prescription_datetime  TIMESTAMP,
    doctor_id               INT REFERENCES doctor(id)
);

-- =========================================================
-- APPOINTMENT
-- =========================================================
CREATE TABLE appointment (
    appointment_id        SERIAL PRIMARY KEY,
    doctor_id             INT REFERENCES doctor(id),
    patient_id            INT REFERENCES "user"(id),
    appointment_datetime   TIMESTAMP,
    status                 appointment_status_enum,
    hospital_id             INT REFERENCES hospitals(id)
);

-- =========================================================
-- AMBULANCE
-- =========================================================
CREATE TABLE ambulance (
    ambulance_id    SERIAL PRIMARY KEY,
    vehicle_number  VARCHAR(20),
    license         VARCHAR(100),
    status          ambulance_status_enum,
    hosp_id         INT REFERENCES hospitals(id) ON DELETE SET NULL   -- null if not associated to hospital
);

-- =========================================================
-- CAMP
-- =========================================================
CREATE TABLE camp (
    camp_id            SERIAL PRIMARY KEY,
    camp_name          VARCHAR(150),
    city               VARCHAR(100),
    specialization     VARCHAR(100),
    camp_date          DATE,
    timing             TEXT[],
    available_slots    INT,
    hospital_id        INT REFERENCES hospitals(id),
    doctor_id          INT REFERENCES doctor(id),
    address            TEXT,
    camp_description   TEXT,
    camp_banner        TEXT
);

-- =========================================================
-- CAMP PATIENT FORM
-- =========================================================
CREATE TABLE camp_patient_form (
    patient_id                SERIAL PRIMARY KEY,   -- unique
    camp_id                   INT REFERENCES camp(camp_id) ON DELETE CASCADE,
    name                      VARCHAR(150),
    phone                     VARCHAR(20),
    age                       INT,
    gender                    VARCHAR(20),
    city                      VARCHAR(100),
    address                   TEXT,
    reason_for_taking_camp    TEXT,
    preferred_time            TIME,
    alternate_contact         VARCHAR(20),
    existing_condition        TEXT,
    chief_complaint           TEXT,
    description               TEXT,
    diagnosis                 TEXT,
    medical_reports           TEXT[],
    follow_up                 camp_followup_enum
);

-- =========================================================
-- RESOURCE
-- =========================================================
CREATE TABLE resource (
    resource_id           SERIAL PRIMARY KEY,
    name                  VARCHAR(150),
    category              resource_category_enum,
    units                 VARCHAR(50),
    supplier              VARCHAR(150),
    manufacturing_date    DATE,
    exp_date              DATE,
    quantity              INT,
    availability_status   resource_availability_enum,
    hospital_id           INT REFERENCES hospitals(id)
);

-- =========================================================
-- TRANSFER TABLE
-- =========================================================
CREATE TABLE transfer_table (
    transfer_id              SERIAL PRIMARY KEY,
    resource_id              INT REFERENCES resource(resource_id),
    source_hospital_id       INT REFERENCES hospitals(id),
    destination_hospital_id  INT REFERENCES hospitals(id),
    quantity                 INT,
    transfer_date            DATE,
    transfer_status          transfer_status_enum
);

COMMIT;
