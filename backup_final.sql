--
-- PostgreSQL database dump
--

\restrict ETYdtJBTx3Mskqqv4lm7stgAiiQ4AEY4YgFLgQEgwVM5atoYo8hlK9Jh2UxfvH9

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    group_name text DEFAULT 'general'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.app_settings OWNER TO postgres;

--
-- Name: appointment_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointment_requests (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    user_id integer,
    patient_name text NOT NULL,
    phone text NOT NULL,
    requested_date text NOT NULL,
    status text DEFAULT 'in_asteptare'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.appointment_requests OWNER TO postgres;

--
-- Name: appointment_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appointment_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointment_requests_id_seq OWNER TO postgres;

--
-- Name: appointment_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appointment_requests_id_seq OWNED BY public.appointment_requests.id;


--
-- Name: businesses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.businesses (
    id integer NOT NULL,
    user_id integer,
    name text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    address text,
    phone text,
    website text,
    image_url text,
    status text DEFAULT 'approved'::text NOT NULL,
    verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.businesses OWNER TO postgres;

--
-- Name: businesses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.businesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.businesses_id_seq OWNER TO postgres;

--
-- Name: businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.businesses_id_seq OWNED BY public.businesses.id;


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id integer NOT NULL,
    user_id integer NOT NULL,
    user_name text NOT NULL,
    channel text DEFAULT 'general'::text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_messages_id_seq OWNER TO postgres;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: community_announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_announcements (
    id integer NOT NULL,
    user_id integer,
    type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    contact text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.community_announcements OWNER TO postgres;

--
-- Name: community_announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.community_announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.community_announcements_id_seq OWNER TO postgres;

--
-- Name: community_announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.community_announcements_id_seq OWNED BY public.community_announcements.id;


--
-- Name: doctor_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.doctor_profiles (
    id integer NOT NULL,
    name text NOT NULL,
    specialization text NOT NULL,
    cabinet_name text,
    address text,
    phone text,
    schedule text,
    status text DEFAULT 'activ'::text NOT NULL,
    substitute_name text,
    substitute_phone text,
    notes text,
    image_url text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.doctor_profiles OWNER TO postgres;

--
-- Name: doctor_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.doctor_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctor_profiles_id_seq OWNER TO postgres;

--
-- Name: doctor_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.doctor_profiles_id_seq OWNED BY public.doctor_profiles.id;


--
-- Name: event_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_participants (
    id integer NOT NULL,
    event_id integer NOT NULL,
    user_id integer NOT NULL,
    user_name text NOT NULL,
    joined_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.event_participants OWNER TO postgres;

--
-- Name: event_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_participants_id_seq OWNER TO postgres;

--
-- Name: event_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_participants_id_seq OWNED BY public.event_participants.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id integer NOT NULL,
    user_id integer,
    title text NOT NULL,
    description text NOT NULL,
    date timestamp without time zone NOT NULL,
    location text NOT NULL,
    image_url text,
    participant_count integer DEFAULT 0,
    category text DEFAULT 'general'::text,
    status text DEFAULT 'approved'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: health_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.health_alerts (
    id integer NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    severity text DEFAULT 'info'::text NOT NULL,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    status text DEFAULT 'activa'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.health_alerts OWNER TO postgres;

--
-- Name: health_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.health_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.health_alerts_id_seq OWNER TO postgres;

--
-- Name: health_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.health_alerts_id_seq OWNED BY public.health_alerts.id;


--
-- Name: health_campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.health_campaigns (
    id integer NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    target_group text,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    location text,
    image_url text,
    status text DEFAULT 'activa'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.health_campaigns OWNER TO postgres;

--
-- Name: health_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.health_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.health_campaigns_id_seq OWNER TO postgres;

--
-- Name: health_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.health_campaigns_id_seq OWNED BY public.health_campaigns.id;


--
-- Name: job_listings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_listings (
    id integer NOT NULL,
    user_id integer,
    company text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    type text DEFAULT 'full_time'::text NOT NULL,
    contact text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone
);


ALTER TABLE public.job_listings OWNER TO postgres;

--
-- Name: job_listings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_listings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_listings_id_seq OWNER TO postgres;

--
-- Name: job_listings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_listings_id_seq OWNED BY public.job_listings.id;


--
-- Name: marketplace_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marketplace_items (
    id integer NOT NULL,
    user_id integer,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    price text,
    contact text NOT NULL,
    image_url text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone
);


ALTER TABLE public.marketplace_items OWNER TO postgres;

--
-- Name: marketplace_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.marketplace_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.marketplace_items_id_seq OWNER TO postgres;

--
-- Name: marketplace_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.marketplace_items_id_seq OWNED BY public.marketplace_items.id;


--
-- Name: municipal_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.municipal_requests (
    id integer NOT NULL,
    user_id integer,
    user_name text,
    title text NOT NULL,
    department text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'in_asteptare'::text NOT NULL,
    admin_reply text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.municipal_requests OWNER TO postgres;

--
-- Name: municipal_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.municipal_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.municipal_requests_id_seq OWNER TO postgres;

--
-- Name: municipal_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.municipal_requests_id_seq OWNED BY public.municipal_requests.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    type text DEFAULT 'info'::text NOT NULL,
    category text DEFAULT 'sistem'::text,
    title text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    author text NOT NULL,
    category text,
    image_url text,
    status text DEFAULT 'approved'::text NOT NULL,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO postgres;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.push_subscriptions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.push_subscriptions OWNER TO postgres;

--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.push_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.push_subscriptions_id_seq OWNER TO postgres;

--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.push_subscriptions_id_seq OWNED BY public.push_subscriptions.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    user_id integer,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    location text,
    lat real,
    lng real,
    status text DEFAULT 'in_asteptare'::text,
    visibility text DEFAULT 'pending'::text,
    admin_reply text,
    image_url text,
    image_urls text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reports_id_seq OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services (
    id integer NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    type text NOT NULL,
    phone text,
    address text,
    lat real,
    lng real,
    schedule text,
    status text DEFAULT 'activ'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.services OWNER TO postgres;

--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.services_id_seq OWNER TO postgres;

--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: social_programs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.social_programs (
    id integer NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    eligibility text,
    period text,
    documents_needed text,
    contact_info text,
    status text DEFAULT 'activ'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.social_programs OWNER TO postgres;

--
-- Name: social_programs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.social_programs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.social_programs_id_seq OWNER TO postgres;

--
-- Name: social_programs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.social_programs_id_seq OWNED BY public.social_programs.id;


--
-- Name: transport_routes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transport_routes (
    id integer NOT NULL,
    type text DEFAULT 'autobuz'::text NOT NULL,
    line text NOT NULL,
    direction text NOT NULL,
    operator text DEFAULT ''::text NOT NULL,
    departures text DEFAULT '[]'::text NOT NULL,
    notes text,
    status text DEFAULT 'activ'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.transport_routes OWNER TO postgres;

--
-- Name: transport_routes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transport_routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transport_routes_id_seq OWNER TO postgres;

--
-- Name: transport_routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transport_routes_id_seq OWNED BY public.transport_routes.id;


--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_badges (
    id integer NOT NULL,
    user_id integer NOT NULL,
    badge_type text NOT NULL,
    awarded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_badges OWNER TO postgres;

--
-- Name: user_badges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_badges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_badges_id_seq OWNER TO postgres;

--
-- Name: user_badges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_badges_id_seq OWNED BY public.user_badges.id;


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    section text NOT NULL,
    can_read boolean DEFAULT false,
    can_write boolean DEFAULT false,
    can_approve boolean DEFAULT false,
    can_delete boolean DEFAULT false
);


ALTER TABLE public.user_permissions OWNER TO postgres;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_permissions_id_seq OWNER TO postgres;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    phone text,
    role text DEFAULT 'cetatean'::text NOT NULL,
    points integer DEFAULT 0,
    notification_prefs text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: weather_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weather_cache (
    id integer NOT NULL,
    location text NOT NULL,
    temperature real,
    condition text,
    humidity integer,
    wind_speed real,
    feels_like real,
    forecast text,
    last_updated timestamp without time zone DEFAULT now()
);


ALTER TABLE public.weather_cache OWNER TO postgres;

--
-- Name: weather_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.weather_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weather_cache_id_seq OWNER TO postgres;

--
-- Name: weather_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.weather_cache_id_seq OWNED BY public.weather_cache.id;


--
-- Name: appointment_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_requests ALTER COLUMN id SET DEFAULT nextval('public.appointment_requests_id_seq'::regclass);


--
-- Name: businesses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses ALTER COLUMN id SET DEFAULT nextval('public.businesses_id_seq'::regclass);


--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: community_announcements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_announcements ALTER COLUMN id SET DEFAULT nextval('public.community_announcements_id_seq'::regclass);


--
-- Name: doctor_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_profiles ALTER COLUMN id SET DEFAULT nextval('public.doctor_profiles_id_seq'::regclass);


--
-- Name: event_participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_participants ALTER COLUMN id SET DEFAULT nextval('public.event_participants_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: health_alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_alerts ALTER COLUMN id SET DEFAULT nextval('public.health_alerts_id_seq'::regclass);


--
-- Name: health_campaigns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_campaigns ALTER COLUMN id SET DEFAULT nextval('public.health_campaigns_id_seq'::regclass);


--
-- Name: job_listings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_listings ALTER COLUMN id SET DEFAULT nextval('public.job_listings_id_seq'::regclass);


--
-- Name: marketplace_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketplace_items ALTER COLUMN id SET DEFAULT nextval('public.marketplace_items_id_seq'::regclass);


--
-- Name: municipal_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.municipal_requests ALTER COLUMN id SET DEFAULT nextval('public.municipal_requests_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: push_subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.push_subscriptions_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: social_programs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_programs ALTER COLUMN id SET DEFAULT nextval('public.social_programs_id_seq'::regclass);


--
-- Name: transport_routes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_routes ALTER COLUMN id SET DEFAULT nextval('public.transport_routes_id_seq'::regclass);


--
-- Name: user_badges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_badges ALTER COLUMN id SET DEFAULT nextval('public.user_badges_id_seq'::regclass);


--
-- Name: user_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: weather_cache id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weather_cache ALTER COLUMN id SET DEFAULT nextval('public.weather_cache_id_seq'::regclass);


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_settings (key, value, label, group_name, updated_at) FROM stdin;
vapid_public_key	BCL7mteyIGMwrDkBYvncrxgyLAzmDv0mRxuT-FwmSE6H-oZ-yT7fXgnQb1pm2c3YBr4f-GKgd_oZ_GENaV0-KTU	VAPID Public Key	sistema	2026-05-03 13:29:21.419902
vapid_private_key	2XvAK564wzgX7yfO3bAo6kM_mx6G2WyHq5cOaHvEo6w	VAPID Private Key	sistema	2026-05-03 13:29:21.419991
demo_mode	false	Mod demonstrativ (read-only)	sistem	2026-05-03 14:03:28.389765
\.


--
-- Data for Name: appointment_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appointment_requests (id, doctor_id, user_id, patient_name, phone, requested_date, status, notes, created_at) FROM stdin;
\.


--
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.businesses (id, user_id, name, category, description, address, phone, website, image_url, status, verified, created_at) FROM stdin;
1	\N	Magazin Alimentar Popescu	Alimentație	Produse alimentare proaspete, lactate locale și legume de sezon. Livrare la domiciliu disponibilă.	Str. Principală nr. 12, Hălchiu	0722 123 456	\N	https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80	approved	f	2026-05-03 13:29:21.922522
2	\N	Pensiunea Casa Hălchiului	Turism	Cazare de 3 stele cu vedere la munți. Mic dejun inclus, grădină și terasă.	Str. Livezilor nr. 5, Hălchiu	0744 987 654	https://casahalchiului.ro	https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80	approved	f	2026-05-03 13:29:21.923068
3	\N	Ferma Văcaru – Lactate Naturale	Agricultură	Lapte, brânzeturi și smântână de la vaci crescute la pășune. Comenzi directe.	Sat Hălchiu, nr. 78	0755 321 987	\N	https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&q=80	approved	f	2026-05-03 13:29:21.92305
4	\N	Cabinet Medical Dr. Moldovan	Sănătate	Medicină de familie. Consultații, recomandări, eliberare rețete compensate.	Str. Școlii nr. 3, Hălchiu	0266 234 567	\N	https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80	approved	f	2026-05-03 13:29:21.923067
5	\N	Atelier Auto Ionescu	Servicii Auto	Reparații auto, ITP, vulcanizare. Experiență de 20 de ani. Prețuri corecte.	DN13 km 7, Hălchiu	0733 456 789	\N	https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&q=80	approved	f	2026-05-03 13:29:21.923272
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_messages (id, user_id, user_name, channel, content, created_at) FROM stdin;
\.


--
-- Data for Name: community_announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.community_announcements (id, user_id, type, title, description, contact, status, created_at) FROM stdin;
1	\N	pierdut	Câine pierdut – Labrador auriu	Am pierdut câinele în zona parcului pe 28 aprilie. Răspunde la numele Rex. Recompensă oferită.	0722 333 444	active	2026-05-03 13:29:21.959702
2	\N	donatie	Donez mobilier din lemn	Donez masă cu 4 scaune din lemn masiv, în stare bună. Ridicare de la domiciliu.	0733 555 666	active	2026-05-03 13:29:21.959806
3	\N	meserias	Zugrav disponibil – lucrări interioare	Execut lucrări de zugrăvit, vopsit, faianță și gresie. Prețuri corecte, lucru îngrijit.	0744 888 111	active	2026-05-03 13:29:21.959936
4	\N	gasit	Chei găsite lângă magazine	Am găsit un set de chei cu breloc alb în fața magazinului Popescu pe 30 aprilie.	0755 222 333	active	2026-05-03 13:29:21.960193
\.


--
-- Data for Name: doctor_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.doctor_profiles (id, name, specialization, cabinet_name, address, phone, schedule, status, substitute_name, substitute_phone, notes, image_url, created_at) FROM stdin;
1	Dr. Elena Moldovan	Medic de Familie	Cabinet Medical Dr. Moldovan	Str. Școlii nr. 3, Hălchiu	0266 234 567	{"lv":"08:00–16:00","s":"09:00–13:00 (urgențe)","d":"Închis"}	activ	\N	\N	Programări telefonice sau direct la cabinet. Lista de așteptare mică.	\N	2026-05-03 13:29:22.007164
2	Dr. Mihai Petrescu	Medic de Familie	Cabinet Medical Petrescu	Str. Principală nr. 18, Hălchiu	0266 345 678	{"lv":"09:00–17:00","s":"Închis","d":"Închis"}	concediu	Dr. Elena Moldovan	0266 234 567	Concediu medical 3–17 mai. Pacienții sunt redirecționați către Dr. Moldovan.	\N	2026-05-03 13:29:22.007285
3	Dr. Ioana Nistor	Pediatru	Dispensarul Pediatric – Hălchiu	Str. Școlii nr. 3, Hălchiu (etaj 1)	0266 456 789	{"lv":"08:00–14:00","s":"09:00–12:00","d":"Închis"}	activ	\N	\N	Specialistă în copii 0–18 ani. Vaccinări în calendar la cabinet.	\N	2026-05-03 13:29:22.007395
\.


--
-- Data for Name: event_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_participants (id, event_id, user_id, user_name, joined_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, user_id, title, description, date, location, image_url, participant_count, category, status, created_at) FROM stdin;
1	\N	Ședință Consiliu Local – Mai	Ședința ordinară a Consiliului Local Hălchiu. Ordinea de zi disponibilă la sediul primăriei.	2026-05-06 13:29:21.897	Sala de ședințe, Primăria Hălchiu	\N	0	general	approved	2026-05-03 13:29:21.899031
4	\N	Plantare arbori – Voluntariat civic	Plantăm 200 de arbori în zona de recreere a comunei. Vino cu familia și contribuie la un mediu mai verde!	2026-05-21 13:29:21.905	Parc Central Hălchiu	https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80	0	voluntariat	approved	2026-05-03 13:29:21.905786
2	\N	Ziua Comunei Hălchiu	Sărbătorim împreună ziua comunei cu spectacole folclorice, expoziție foto și foc de artificii.	2026-05-15 13:29:21.897	Piața Centrală Hălchiu	https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80	0	cultural	approved	2026-05-03 13:29:21.899011
3	\N	Acțiune de ecologizare – Pădure	Curățăm împreună zona forestieră din nordul comunei. Echipament asigurat. Toți cetățenii sunt invitați!	2026-05-08 13:29:21.905	Pădure Nordică, punct de întâlnire: intrare pădure	https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80	0	voluntariat	approved	2026-05-03 13:29:21.905711
\.


--
-- Data for Name: health_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.health_alerts (id, type, title, description, severity, start_date, end_date, status, created_at) FROM stdin;
2	canicula	COD GALBEN caniculă – Avertizare meteorologică	Temperaturi de peste 37°C sunt prognozate pentru 3–5 mai. Evitați expunerea la soare între 11:00–18:00. Consumați apă frecvent. Persoanele vârstnice și copiii sunt cei mai vulnerabili.	warning	2026-05-03 00:00:00	2026-05-05 00:00:00	activa	2026-05-03 13:29:21.990781
3	apa	Calitate apă potabilă – Analiză favorabilă	Ultima analiză a calității apei potabile distribuite în rețeaua comunei Hălchiu indică parametri în limite normale. Apa este sigură pentru consum uman. Urmând analizele periodice lunare.	info	2026-05-01 00:00:00	\N	activa	2026-05-03 13:29:21.990988
1	epidemie	Gripă sezonieră – Recomandări DSP Brașov	Direcția de Sănătate Publică Brașov recomandă vaccinarea antigripală la dispensarul local. Programul de vaccinare continuă până la epuizarea stocului. Vaccinarea este gratuită pentru persoanele din grupele de risc.	info	2026-04-01 00:00:00	2026-05-31 00:00:00	activa	2026-05-03 13:29:21.9909
\.


--
-- Data for Name: health_campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.health_campaigns (id, type, title, description, target_group, start_date, end_date, location, image_url, status, created_at) FROM stdin;
1	screening	Screening diabet și hipertensiune	Caravana medicală mobilă vine în Hălchiu cu analize gratuite pentru detectarea timpurie a diabetului și hipertensiunii arteriale. Fără programare prealabilă. Durata consultației: ~20 minute.	Adulți peste 40 ani	2026-05-15 00:00:00	2026-05-15 00:00:00	Sala Polivalentă Hălchiu	https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80	viitoare	2026-05-03 13:29:21.999066
2	vaccinare	Campanie vaccinare antigripală 2026	Vaccinul antigripal este disponibil gratuit la dispensarul comunal pentru grupele de risc: vârstnici peste 65 ani, copii 6 luni–8 ani, femei însărcinate, persoane cu boli cronice.	Vârstnici, copii, gravide, bolnavi cronici	2026-04-01 00:00:00	2026-06-30 00:00:00	Dispensarul Medical Hălchiu, Str. Școlii nr. 3	https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&q=80	activa	2026-05-03 13:29:21.999198
3	preventie	Campanie educație sanitară – Igiena mâinilor	Medicii de familie derulează sesiuni de educație sanitară în școlile din comună. Copiii învață tehnicile corecte de spălare a mâinilor și prevenție a infecțiilor respiratorii.	Copii 6–14 ani, părinți	2026-05-05 00:00:00	2026-05-20 00:00:00	Școala Generală Hălchiu	\N	activa	2026-05-03 13:29:21.999591
4	caravana	Caravană stomatologică gratuită	Medicii stomatologi voluntari din Brașov oferă consultații și tratamente stomatologice gratuite copiilor din comună cu vârste între 4 și 14 ani. Locuri limitate – înregistrare la dispensarul comunal.	Copii 4–14 ani	2026-06-01 00:00:00	2026-06-03 00:00:00	Dispensarul Medical Hălchiu	\N	viitoare	2026-05-03 13:29:21.999609
\.


--
-- Data for Name: job_listings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_listings (id, user_id, company, title, description, type, contact, status, created_at, expires_at) FROM stdin;
1	\N	Atelier Auto Ionescu	Mecanic Auto	Căutăm mecanic auto cu experiență de minim 3 ani. Se oferă salariu atractiv și program fix.	full_time	0733 456 789	active	2026-05-03 13:29:21.966244	\N
2	\N	Ferma Văcaru	Muncitor agricol sezonier	Angajăm pentru sezonul de vară. Lucrări agricole generale. Cazare asigurată.	sezonier	0755 321 987	active	2026-05-03 13:29:21.966388	\N
3	\N	Pensiunea Casa Hălchiului	Cameristă / Operator recepție	Angajăm pentru sezonul turistic. Experiența nu este obligatorie – se oferă training.	part_time	0744 987 654	active	2026-05-03 13:29:21.966785	\N
\.


--
-- Data for Name: marketplace_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.marketplace_items (id, user_id, title, description, category, price, contact, image_url, status, created_at, expires_at) FROM stdin;
1	\N	Legume proaspete din grădina mea	Tomate, castraveți, ardei, dovlecel – recoltate zilnic. Fără pesticide.	produse	Negociabil	0733 444 555	https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80	active	2026-05-03 13:29:21.952963	\N
2	\N	Miere naturală de salcâm – 1kg	Miere pură de salcâm din stupina proprie. Fără aditivi. Disponibil în borcane de 1kg.	produse	35 RON/kg	0722 111 222	https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80	active	2026-05-03 13:29:21.95283	\N
3	\N	Servicii de grădinărit	Tuns gazon, aranjat grădini, plantat copaci. Tarif orar sau per proiect.	servicii	50 RON/oră	0744 777 888	\N	active	2026-05-03 13:29:21.953006	\N
4	\N	Ouă de țară – găini crescute liber	Ouă proaspete, disponibile zilnic. Minimum 10 bucăți per comandă.	produse	1.5 RON/buc	0755 666 999	https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&q=80	active	2026-05-03 13:29:21.953448	\N
\.


--
-- Data for Name: municipal_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.municipal_requests (id, user_id, user_name, title, department, description, status, admin_reply, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, category, title, message, read, created_at) FROM stdin;
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posts (id, type, title, content, author, category, image_url, status, expires_at, created_at) FROM stdin;
1	announcement	Reabilitare DC 115 – Lucrări finalizate	Lucrările de reabilitare a drumului comunal DC 115 au fost finalizate. Mulțumim cetățenilor pentru răbdare.	Primăria Hălchiu	Infrastructură	https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=800&q=80	approved	\N	2026-05-03 13:29:21.890461
2	alert	ALERTĂ: Întrerupere apă curentă	Vineri, 09.05, între orele 08:00 – 14:00, va fi întreruptă furnizarea apei în zona Centru și Str. Florilor din cauza lucrărilor de reparații.	Primăria Hălchiu	Utilități	\N	approved	\N	2026-05-03 13:29:21.890476
3	community	Caut colegă de drum spre Brașov	Merg zilnic spre Brașov în jurul orei 7:30. Caut pe cineva cu care să împart deplasarea. Contactați-mă la numărul de mai jos.	Maria P.	Comunitate	\N	approved	\N	2026-05-03 13:29:21.891124
4	announcement	Program Stare Civilă – mai 2025	Biroul Stare Civilă va funcționa în luna mai cu program extins: Luni–Vineri 08:00–17:00. Programările se fac telefonic.	Primăria Hălchiu	Administrație	\N	approved	\N	2026-05-03 13:29:21.891133
\.


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, user_id, title, description, category, location, lat, lng, status, visibility, admin_reply, image_url, image_urls, created_at) FROM stdin;
1	\N	Groapă adâncă pe Strada Principală	La intersecția cu Str. Florilor există o groapă periculoasă care poate afecta vehiculele.	Drum	Str. Principală, intersecție cu Str. Florilor	\N	\N	in_asteptare	public	\N	\N	\N	2026-05-03 13:29:21.91198
2	\N	Gunoi abandonat la marginea pădurii	Au fost abandonate mai multe pungi de gunoi la intrarea în pădure. Vă rog să interveniti.	Salubrizare	Intrare pădure, lângă cimitir	\N	\N	in_asteptare	public	\N	\N	\N	2026-05-03 13:29:21.912136
3	\N	Stâlp de iluminat defect	Stâlpul de la nr. 42 nu funcționează de 2 săptămâni. Zona este periculoasă noaptea.	Iluminat	Str. Nouă nr. 42	\N	\N	in_asteptare	public	\N	\N	\N	2026-05-03 13:29:21.913164
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.services (id, name, category, type, phone, address, lat, lng, schedule, status, created_at) FROM stdin;
1	Farmacie Sănătatea	medical	farmacie	0766 112 233	Str. Principală nr. 8, Hălchiu	45.7695	25.5928	{"lv":"08:00-20:00","s":"09:00-15:00","d":"inchis"}	activ	2026-05-03 13:29:21.930533
3	Poliția Locală Hălchiu	administratie	politie_locala	0266 XXX XXX	Str. Principală nr. 1, Hălchiu	45.77	25.592	{"lv":"08:00-16:00","s":"inchis","d":"inchis"}	activ	2026-05-03 13:29:21.930764
4	Grădinița Hălchiu	educatie	gradinita	0266 XXX XXX	Str. Școlii nr. 2, Hălchiu	45.769	25.5936	{"lv":"07:00-17:00","s":"inchis","d":"inchis"}	activ	2026-05-03 13:29:21.930908
5	Oficiul Poștal Hălchiu	posta	posta	0266 XXX XXX	Str. Nouă nr. 5, Hălchiu	45.7685	25.594	{"lv":"08:00-15:00","s":"09:00-12:00","d":"inchis"}	activ	2026-05-03 13:29:21.931202
6	Școala Generală Hălchiu	educatie	scoala	0266 XXX XXX	Str. Școlii nr. 1, Hălchiu	45.7692	25.5935	{"lv":"08:00-14:00","s":"inchis","d":"inchis"}	activ	2026-05-03 13:29:21.931388
7	Cabinet Medical Dr. Moldovan	medical	medic_familie	0266 234 567	Str. Școlii nr. 3, Hălchiu	45.7689	25.5932	{"lv":"08:00-16:00","s":"09:00-13:00","d":"inchis"}	activ	2026-05-03 13:29:21.931594
2	Primăria Comunei Hălchiu	administratie	primarie	0266 XXX XXX	Str. Principală nr. 1, Hălchiu	45.77	25.592	{"lv":"08:00-16:30","s":"inchis","d":"inchis"}	activ	2026-05-03 13:29:21.930622
8	Salubritate – Colectare Deșeuri	utilitati	salubritate	0266 XXX XXX	Str. Principală nr. 1, Hălchiu	\N	\N	{"lv":"08:00-16:00","s":"inchis","d":"inchis"}	activ	2026-05-03 13:29:21.943969
9	Apă Canal Hălchiu	utilitati	apa	0800 100 500	Str. Industrială nr. 3, Hălchiu	\N	\N	{"lv":"08:00-16:00","s":"inchis","d":"inchis"}	activ	2026-05-03 13:29:21.944297
10	Distribuție Electricitate (CEZ)	utilitati	electricitate	0800 800 800	\N	\N	\N	{"lv":"08:00-16:30","s":"inchis","d":"inchis"}	activ	2026-05-03 13:29:21.946453
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (sid, sess, expire) FROM stdin;
fTq-xwSJUSYHyRlC4HTOU8CLY1tl-6ho	{"cookie":{"originalMaxAge":604800000,"expires":"2026-05-10T13:31:48.956Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":1,"userRole":"administrator","userName":"Administrator","username":"admin"}	2026-05-10 15:29:07
\.


--
-- Data for Name: social_programs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.social_programs (id, type, title, description, eligibility, period, documents_needed, contact_info, status, created_at) FROM stdin;
1	incalzire	Ajutor pentru încălzire – Sezon 2025/2026	Primăria Hălchiu acordă ajutoare financiare pentru încălzire familiilor cu venituri reduse. Ajutorul se acordă lunar pe perioada sezonului rece, conform legislației în vigoare (OUG 70/2011).	Familii cu venit net lunar sub 1.386 lei/persoană. Proprietari sau chiriași de locuință în comună.	Noiembrie 2025 – Martie 2026	CI, adeverință venituri, factură utilitare, certificat căsătorie/naștere copii (dacă e cazul)	Compartiment Asistență Socială, Primăria Hălchiu – Tel: 0266 200 100	inactiv	2026-05-03 13:29:22.015561
2	lemne	Cote de lemne pentru foc – 2026	Cetățenii comunei Hălchiu beneficiază de lemne de foc la prețuri subvenționate din fondul forestier comunal. Cotele se acordă anual conform Legii 46/2008 și HCL Hălchiu.	Gospodării care se înclzesc cu lemne. Prioritate: familii cu membri cu dizabilități, vârstnici singuri, familii monoparentale.	Iulie – Septembrie 2026 (comenzi)	Cerere tip (disponibilă la primărie), CI, dovada domiciliului în comună	Primăria Hălchiu, cam. 3 – Program: Luni–Vineri 08:00–16:00	activ	2026-05-03 13:29:22.015573
3	vouchere	Vouchere sociale pentru alimente	Programul național "Ajutor alimentar" distribuie lunar vouchere electronice pentru produse alimentare de bază. Voucherele se utilizează la rețeaua de magazine partenere.	Persoane cu venituri sub pragul de sărăcie. Beneficiari de VMG, alocații suplimentare, pensii sub 1.000 lei.	Program permanent – verificare anuală eligibilitate	CI, adeverință de venituri sau decizie beneficiu social	AJPIS Brașov sau direct la Primăria Hălchiu – Asistență Socială	activ	2026-05-03 13:29:22.01609
4	sprijin	Sprijin pentru persoane vârstnice singure	Servicii de îngrijire la domiciliu pentru persoanele vârstnice singure sau cu mobilitate redusă din comună: asistență igienă personală, preparare masă, însoțire la medic, ajutor la efectuarea actelor.	Persoane peste 65 ani fără rude în localitate sau cu mobilitate redusă	Program permanent	Cerere tip, fișă medicală, anchetă socială efectuată de asistentul social	Asistent social comunitar: 0744 100 200 – Program: Luni–Joi 09:00–15:00	activ	2026-05-03 13:29:22.016423
5	informare	Alocație de stat – Actualizare cuantumuri 2026	Alocația de stat pentru copii a fost majorată începând cu ianuarie 2026. Cuantumul actual: 700 lei/lună pentru copii 0–2 ani, 243 lei pentru copii 2–18 ani. Plata se face direct în contul bancar al beneficiarului.	Toți copiii cu vârsta 0–18 ani cu domiciliu sau reședință în România	Permanent	Certificat naștere, CI părinți, cont bancar	AJPIS Brașov sau online: www.mmuncii.ro	activ	2026-05-03 13:29:22.016415
\.


--
-- Data for Name: transport_routes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transport_routes (id, type, line, direction, operator, departures, notes, status, created_at) FROM stdin;
1	taxi	Taxi Hălchiu	Hălchiu – oriunde	Taxi local	[]	Contact: 0266 XXX XXX. Disponibil 24/7.	activ	2026-05-03 14:03:28.395085
2	maxitaxi	Maxitaxi	Hălchiu ↔ Brașov (frecvent)	Operator privat	["06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30"]	Frecvență ridicată în orele de vârf.	activ	2026-05-03 14:03:28.395101
3	autobuz	Linia 19	Brașov (Gara CFR) → Hălchiu	RAT Brașov	["06:30","07:15","07:50","08:30","09:10","09:50","10:45","11:45","12:45","13:45","14:45","15:45","16:45","17:45","18:45","19:45","20:45"]	Program L–V, cu unele curse în weekend.	activ	2026-05-03 14:03:28.395075
4	autobuz	Linia 19	Hălchiu → Brașov (Gara CFR)	RAT Brașov	["06:05","06:45","07:20","08:00","08:35","09:15","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"]	Program L–V, cu unele curse în weekend.	activ	2026-05-03 14:03:28.39494
\.


--
-- Data for Name: user_badges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_badges (id, user_id, badge_type, awarded_at) FROM stdin;
\.


--
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_permissions (id, user_id, section, can_read, can_write, can_approve, can_delete) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, name, phone, role, points, notification_prefs, created_at) FROM stdin;
1	admin	$2b$10$tdeEAneSVuOosWoMsm4Gre74jNs.JFiSV9N5FY18dMxGhizO.BdY6	Administrator	\N	administrator	0	\N	2026-05-03 13:29:21.547599
2	primar	$2b$10$Jr3BidpwzCP3/SqkibIMOe1ppQszk74eQ5nkKszr5pd.3QOYDJclu	Ion Popescu	\N	primar	0	\N	2026-05-03 13:29:21.615239
3	viceprimar	$2b$10$Lf0YCxQXJ6Bo4g8OpdJ2ue.exK3AMiP5.QJBHiuTFiBSAnZ2bvVxe	Maria Ionescu	\N	viceprimar	0	\N	2026-05-03 13:29:21.682284
4	functionar	$2b$10$VjjXWpQARWWLXIVuDvcAuuG/vgqItRoWzHehDsm22qjO8PMyMbngO	Gheorghe Marin	\N	functionar_public	0	\N	2026-05-03 13:29:21.74986
5	moderator	$2b$10$egt9sqUULebMgJALp1hoCeukFIVjk1SPUpY9OxZ3EX5IqAlKu7zEq	Ana Popa	\N	moderator	0	\N	2026-05-03 13:29:21.817275
6	cetatean	$2b$10$60bW9vD.nbZLkTSpHuCo6e3LuFzIhcDw5liTrwzgvV1CoE4ROa5xO	Vasile Lungu	\N	cetatean	0	\N	2026-05-03 13:29:21.884833
\.


--
-- Data for Name: weather_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weather_cache (id, location, temperature, condition, humidity, wind_speed, feels_like, forecast, last_updated) FROM stdin;
\.


--
-- Name: appointment_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appointment_requests_id_seq', 1, false);


--
-- Name: businesses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.businesses_id_seq', 5, true);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chat_messages_id_seq', 1, false);


--
-- Name: community_announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.community_announcements_id_seq', 4, true);


--
-- Name: doctor_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.doctor_profiles_id_seq', 3, true);


--
-- Name: event_participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_participants_id_seq', 1, false);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.events_id_seq', 4, true);


--
-- Name: health_alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.health_alerts_id_seq', 3, true);


--
-- Name: health_campaigns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.health_campaigns_id_seq', 4, true);


--
-- Name: job_listings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.job_listings_id_seq', 3, true);


--
-- Name: marketplace_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.marketplace_items_id_seq', 4, true);


--
-- Name: municipal_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.municipal_requests_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posts_id_seq', 4, true);


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.push_subscriptions_id_seq', 1, false);


--
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reports_id_seq', 3, true);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.services_id_seq', 10, true);


--
-- Name: social_programs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.social_programs_id_seq', 5, true);


--
-- Name: transport_routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transport_routes_id_seq', 4, true);


--
-- Name: user_badges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_badges_id_seq', 1, false);


--
-- Name: user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_permissions_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: weather_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.weather_cache_id_seq', 1, false);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: appointment_requests appointment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_requests
    ADD CONSTRAINT appointment_requests_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: community_announcements community_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_announcements
    ADD CONSTRAINT community_announcements_pkey PRIMARY KEY (id);


--
-- Name: doctor_profiles doctor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_profiles
    ADD CONSTRAINT doctor_profiles_pkey PRIMARY KEY (id);


--
-- Name: event_participants event_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: health_alerts health_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_alerts
    ADD CONSTRAINT health_alerts_pkey PRIMARY KEY (id);


--
-- Name: health_campaigns health_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_campaigns
    ADD CONSTRAINT health_campaigns_pkey PRIMARY KEY (id);


--
-- Name: job_listings job_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_listings
    ADD CONSTRAINT job_listings_pkey PRIMARY KEY (id);


--
-- Name: marketplace_items marketplace_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketplace_items
    ADD CONSTRAINT marketplace_items_pkey PRIMARY KEY (id);


--
-- Name: municipal_requests municipal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.municipal_requests
    ADD CONSTRAINT municipal_requests_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: social_programs social_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_programs
    ADD CONSTRAINT social_programs_pkey PRIMARY KEY (id);


--
-- Name: transport_routes transport_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_routes
    ADD CONSTRAINT transport_routes_pkey PRIMARY KEY (id);


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: weather_cache weather_cache_location_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weather_cache
    ADD CONSTRAINT weather_cache_location_unique UNIQUE (location);


--
-- Name: weather_cache weather_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weather_cache
    ADD CONSTRAINT weather_cache_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: chat_channel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX chat_channel_idx ON public.chat_messages USING btree (channel, created_at DESC);


--
-- Name: user_badges_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_badges_unique ON public.user_badges USING btree (user_id, badge_type);


--
-- PostgreSQL database dump complete
--

\unrestrict ETYdtJBTx3Mskqqv4lm7stgAiiQ4AEY4YgFLgQEgwVM5atoYo8hlK9Jh2UxfvH9

