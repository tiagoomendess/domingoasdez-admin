-- New tables inherit the database's default collation. Laravel created every table with
-- utf8mb4_unicode_ci, but the production database defaults to utf8mb4_general_ci, so tables
-- created by migrations would not match the existing ones ("Illegal mix of collations" when
-- comparing or joining their text columns). This only changes the default for new tables:
-- existing tables and columns keep their collation.
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
