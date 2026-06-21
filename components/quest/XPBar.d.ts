/**
 * Signature XP progress bar — the most visually distinctive component in Quest!
 * White glass card, indigo fill with violet right-blend + glass sheen strip.
 * Auto-calculates level and progress from totalXp using the canonical level thresholds.
 *
 * @startingPoint section="Quest Components" subtitle="XP progress with level markers" viewport="700x120"
 */
export interface XPBarProps {
  /**
   * User's total accumulated XP (not weekly XP).
   * Level is derived automatically: Lv1=0, Lv2=200, Lv3=500, Lv4=1000, Lv5=2000,
   * Lv6=3500, Lv7=5500, Lv8=8000, Lv9=11000, Lv10=15000
   */
  totalXp?: number
}
