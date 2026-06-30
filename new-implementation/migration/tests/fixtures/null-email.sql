-- CustomerID 2 has a NULL Email → lowerTrim → null → hits the target's
-- NOT NULL `email` constraint at INSERT time. This is a DB-level RowError
-- (no transform threw), proving constraint failures are collected, not fatal.
CREATE TABLE tblCustomers (
  CustomerID INT PRIMARY KEY,
  FullName   VARCHAR(255) NOT NULL,
  Email      VARCHAR(255) NULL,            -- nullable so we can store a NULL
  Phone      VARCHAR(50)  NULL,
  Address    VARCHAR(255) NULL,
  CreatedOn  DATETIME     NOT NULL,
  IsDeleted  TINYINT      NOT NULL DEFAULT 0
);

INSERT INTO tblCustomers (CustomerID, FullName, Email, Phone, Address, CreatedOn, IsDeleted) VALUES
  (1, 'Ada Lovelace', 'ada@x.com', '555-0001', '1 Analytical St', '2024-01-02 03:04:05', 0),
  (2, 'No Email',      NULL,        '555-0002', '2 Nowhere',       '2023-06-15 10:00:00', 0),
  (3, 'Grace Hopper', 'grace@x.com','555-0003', '3 Navy Yard',     '2022-12-01 08:30:00', 0);
