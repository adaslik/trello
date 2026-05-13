-- Duplicate etiketleri temizle (her workspace+position için birini bırak)
DELETE FROM labels WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY workspace_id, position ORDER BY id) AS rn
    FROM labels
  ) t WHERE rn > 1
);

-- Gelecekte tekrar oluşmasını önle
ALTER TABLE labels
  ADD CONSTRAINT labels_workspace_position_unique
  UNIQUE (workspace_id, position);
