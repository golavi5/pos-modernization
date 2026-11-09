import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCompanyDto } from './settings.dto';

const errorsFor = async (body: object) =>
  (await validate(plainToInstance(UpdateCompanyDto, body))).map((e) => e.property);

// The Settings → Empresa form sends the whole section on save, including an empty
// email; that used to be a 400 and made the section unsaveable until it was filled.
describe('UpdateCompanyDto', () => {
  it('accepts an empty email (clearing it) and a missing one', async () => {
    expect(await errorsFor({ companyName: 'X', email: '' })).toEqual([]);
    expect(await errorsFor({ companyName: 'X' })).toEqual([]);
  });

  it('still rejects a non-empty email that is not an address', async () => {
    expect(await errorsFor({ email: 'not-an-email' })).toEqual(['email']);
    expect(await errorsFor({ email: 'ok@example.com' })).toEqual([]);
  });

  it('validates the timezone: real IANA zones pass, invented ones do not', async () => {
    expect(await errorsFor({ timezone: 'America/Bogota' })).toEqual([]);
    expect(await errorsFor({ timezone: 'Asia/Kolkata' })).toEqual([]);
    expect(await errorsFor({ timezone: 'Mars/Olympus_Mons' })).toEqual(['timezone']);
  });
});
