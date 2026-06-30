-- Contains a table (tblAuditLog) with no rule in the registry. import must
-- HALT at pre-flight (exit 2) rather than silently skip it.
CREATE TABLE tblCustomers (
  CustomerID INT PRIMARY KEY,
  FullName   VARCHAR(255) NOT NULL,
  Email      VARCHAR(255) NOT NULL,
  Phone      VARCHAR(50)  NULL,
  Address    VARCHAR(255) NULL,
  CreatedOn  DATETIME     NOT NULL,
  IsDeleted  TINYINT      NOT NULL DEFAULT 0
);

CREATE TABLE tblAuditLog (
  Id INT PRIMARY KEY,
  Action VARCHAR(255)
);

INSERT INTO tblCustomers (CustomerID, FullName, Email, Phone, Address, CreatedOn, IsDeleted) VALUES
  (1, 'Ada Lovelace', 'ada@x.com', '555-0001', '1 Analytical St', '2024-01-02 03:04:05', 0);
INSERT INTO tblAuditLog (Id, Action) VALUES (1, 'login');
