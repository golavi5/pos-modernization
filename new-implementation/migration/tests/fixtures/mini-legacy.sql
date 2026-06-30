-- Minimal legacy fixture for the e2e parity seam: customers only (no FKs).
-- Exercises: case/space normalization (row 4), null phone/address (rows 3,5),
-- soft-delete (row 4), varied dates.
CREATE TABLE tblCustomers (
  CustomerID INT PRIMARY KEY,
  FullName   VARCHAR(255) NOT NULL,
  Email      VARCHAR(255) NOT NULL,
  Phone      VARCHAR(50)  NULL,
  Address    VARCHAR(255) NULL,
  CreatedOn  DATETIME     NOT NULL,
  IsDeleted  TINYINT      NOT NULL DEFAULT 0
);

INSERT INTO tblCustomers (CustomerID, FullName, Email, Phone, Address, CreatedOn, IsDeleted) VALUES
  (1, 'Ada Lovelace',      'ADA@Example.com',  '555-0001', '1 Analytical St',  '2024-01-02 03:04:05', 0),
  (2, 'Alan Turing',       'alan@x.com',       '555-0002', '2 Enigma Rd',      '2023-06-15 10:00:00', 0),
  (3, 'Grace Hopper',      'grace@navy.mil',   '555-0003', NULL,               '2022-12-01 08:30:00', 0),
  (4, 'Edsger Dijkstra',   '  Edsger@X.com  ', '555-0004', '4 Shortest Path',  '2021-03-03 03:03:03', 1),
  (5, 'Katherine Johnson', 'kj@nasa.gov',      NULL,       '5 Orbit Ave',      '2020-07-04 00:00:00', 0);
