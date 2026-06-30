-- One row (CustomerID 2) has an un-parseable CreatedOn → a RowError during
-- import. With a tolerance ≥1 the table commits as `partial`; the bad row is
-- not written, so verify reports it `missing`.
CREATE TABLE tblCustomers (
  CustomerID INT PRIMARY KEY,
  FullName   VARCHAR(255) NOT NULL,
  Email      VARCHAR(255) NOT NULL,
  Phone      VARCHAR(50)  NULL,
  Address    VARCHAR(255) NULL,
  CreatedOn  VARCHAR(64)  NOT NULL,   -- VARCHAR so we can store garbage
  IsDeleted  TINYINT      NOT NULL DEFAULT 0
);

INSERT INTO tblCustomers (CustomerID, FullName, Email, Phone, Address, CreatedOn, IsDeleted) VALUES
  (1, 'Ada Lovelace', 'ada@x.com',  '555-0001', '1 Analytical St', '2024-01-02 03:04:05', 0),
  (2, 'Broken Date',  'bad@x.com',  '555-0002', '2 Nowhere',       'not-a-real-date',      0),
  (3, 'Grace Hopper', 'grace@x.com','555-0003', '3 Navy Yard',     '2022-12-01 08:30:00', 0);
