function calculateCatchRate({
  maxHP,
  currentHP,
  catchRate,
  ballBonus,
  statusBonus,
  extraBonus,
}) {
  const a =
    ((3 * maxHP - 2 * currentHP) *
      catchRate *
      ballBonus *
      statusBonus *
      extraBonus) /
    (3 * maxHP);

  const probability = Math.min(100, (a / 255) * 100);

  return {
    rawValue: a.toFixed(2),
    probability: probability.toFixed(2),
  };
}

module.exports = { calculateCatchRate };
