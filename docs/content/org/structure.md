# Оргструктура (оптимизация без расширения штата)

```mermaid
flowchart TB
  COO["Опердир (A: деньги/приоритеты)"]
  Sales["Продажи / WB (РОП + менеджеры)"]
  Product["Продуктолог"]
  Procurement["Закупщик"]
  Warehouse["ОМ МойСклад"]
  Finance["Финансист"]
  Assistant["Ассистент"]

  COO --> Sales
  COO --> Product
  COO --> Procurement
  COO --> Warehouse
  COO --> Finance
  COO --> Assistant
