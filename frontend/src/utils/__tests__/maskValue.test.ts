import { describe, it, expect } from 'vitest';
import { maskValue, isMasked, MASKED_VALUE } from '../maskValue';

describe('maskValue (NCL-01-CN-005)', () => {
  it('trả về giá trị thật khi được phép xem', () => {
    expect(maskValue(320000000, true)).toBe(320000000);
  });

  it('trả về ký hiệu che khi không được phép xem', () => {
    expect(maskValue(320000000, false)).toBe(MASKED_VALUE);
  });

  it('ký hiệu che khớp đúng với backend MaskingJsonSerializer.MASKED_VALUE', () => {
    expect(MASKED_VALUE).toBe('***');
  });
});

describe('isMasked', () => {
  it('nhận diện đúng giá trị đã bị che', () => {
    expect(isMasked('***')).toBe(true);
  });

  it('không nhận nhầm giá trị thật là bị che', () => {
    expect(isMasked(320000000)).toBe(false);
    expect(isMasked('320000000')).toBe(false);
    expect(isMasked(null)).toBe(false);
    expect(isMasked(undefined)).toBe(false);
  });
});
