__оригинал статьи находится после перевода__
# ПЕРЕВОД (`RU`)

# NobodysNightmare's Screeps AI
Это мой личный ИИ для компьютерной игры [`Screeps`](https://screeps.com).
<br>
<br>

## __1.__ Ручное управление
### Переопределение памяти
<br>

#### 1. `Memory.hibernateGclFarming`
Если `true`, комнаты с RCL 8 будут обновляться только в минимальном объеме, но не с максимально возможной скоростью. 

Это призвано значительно сократить количество затрачиваемой энергии что, в свою очередь, может привести к отключению большей части потребление процессора, поскольку должно потребоваться меньше удаленных шахт.
<br>
<br>

#### 2. `Memory.sellPower`
Если `true`, то сила (power) продается на рынке, а не перерабатывается.
<br>
<br>

#### 3. `Memory.onlySellToNpcs`

Если `true`, то торговля с другими игроками производиться не будет. 
Рыночный код будет рассматривать только NPC-трейдеров для продажи ресурсов.
<br>
<br>

#### 4. `Memory.disableAutoExpansion`

Если `true`, ИИ не будет пытаться автоматически расширяться в новые комнаты.
Это полезно, если политика должна стимулировать экспансию.

Примечание: Автоматическое расширение в настоящее время является экспериментальным.
Это влияет как на получение новых комнат, так и на выбор удаленных шахт.
<br>
<br>

#### 5. `Memory.generatePixels`
Глобальный переключатель для включения генерации пикселей.
Пиксели будут генерироваться каждый раз, когда корзина заполнится.
<br>
<br>
<br>

### 1.1 Конструкции
<br>

Несколько структур и групп структур могут быть предварительно спланированы.
Общее правило состоит в том, чтобы установить флаг с именем `buildName`, чтобы спланировать структуру с именем `Name` (допустимые значения см. ниже) в указанной позиции.

Используя флаг под названием `removeName`, вы можете удалить именованную структуру в этой позиции.

В зависимости от структуры может быть запланировано только ограниченное количество или цвет флага может иметь значение.
<br>
<br>

#### 1. `Кластеры расширений (Extension Clusters)`

* **Название здания:** `buildextensionCluster` , `removeextensionCluster`
* **Цвет:** не имеет значения

Отмечает область, где будет построено несколько расширений.
Контур точно соответствует дорогам, которые будут проложены вокруг пристроек.
<br>
<br>

#### 2. `Стандартный блок с расширениями (scalableExtensions)`

* **Название здания:** `buildscalableExtensions` , `removescalableExtensions`
* **Цвет:** Верхний цвет отвечает за ширину блока, нижний цвет отвечает за высоту вниз. При выборе первого цвета, то отсчет насчинается с 5, второй цвет это 6 и так далее...

Отмечает область, где будет построен стандартный блок с расширениями.
<br>
<br>

#### 3. `Блок с башнями (towerStack)`

* **Название здания:** `buildtowerStack` , `removetowerStack`
* **Цвет:** Определяет направление блока. Начиная сверху, по часовой стрелке. (Первый цвет = вверх)

Планирует блок с башнями в указанном месте.
<br>
<br>

#### 4. `Башни (Towers)`

* **Название здания:** `buildtower` , `removetower`
* **Цвет:** не имеет значения

Планирует башню в указанном месте.
<br>
<br>

#### 5. `Хранилище (Storage)`

* **Название здания:** `buildstorage` , `removestorage`
* **Цвет:** Определяет направление link. Начиная сверху, по часовой стрелке.
Допустимы только первые 4 цвета.

Отмечает место, где должно быть построено хранилище в помещении.
Стрелка указывает, в каком направлении будет размещен link для хранилища.

Примечание: Поскольку можно разместить только одно хранилище, размещение дополнительных хранилищ приведет к очистке старого хранилища.
<br>
<br>

#### 6. `Линк - контейнер (store)`

* **Название здания:** `buildstore` , `removestore`
* **Цвет:** Первый цвет определяет как просто контейнер, все остальные это строит линк

Отмечает место, где должен быть построен в помещении линк или контейнер.
<br>
<br>

#### 7. `Терминал (Terminal)`

* **Название здания:** `buildterminal` , `removeterminal`
* **Цвет:** не имеет значения

Планирует терминал в указанном месте.
<br>
<br>

#### 8. `Лаборатория_реактор (Reactor)`

* **Название здания:** `buildreactor` , `removereactor`
* **Цвет:** Определяет направление входа в реактор. Начиная с верхнего левого угла, по часовой стрелке.
Допустимы только первые 4 цвета.

Вокруг этого места будут построены лаборатории, которые затем будут перерабатывать минералы в соединения.
<br>
<br>

#### 9. `Усилитель (Booster)`

* **Название здания:** `buildbooster` , `removebooster`
* **Цвет:** никакого эффекта

Появится лаборатория, которая будет использоваться для усиления крипов.
<br>
<br>

#### 10. `Стены (Walls)`

* **Название здания:** `buildwall` , `removewall`

Нужно дважды установить флаг. Первый флаг установит начальную позицию, второй - конечную.

Стена будет построена как угол от начала до конца, сначала двигаясь в горизонтальном направлении.
<br>
<br>

#### 11. `Выходные стены (exitWalls)`

* **Название здания:** `buildexitWalls` , `removeexitWalls`
* * **Цвет:** 

Примечание: Удаление черчежа работает, с добавлением пока не разобрался

<br>
<br>
<br>

### 1.2 Спавн ботов (Spawning Creeps)
<br>

Доступно несколько операций спавна ботов. Все они управляются по одной и той же схеме.
Комната, в которой должны появляться боты, получает флаг с именем `spawnNameX`, где `Name` - это название операции (см. Ниже), а `X` - идентификатор операции (например, `1`).
Комната, на которую нацелена операция, получает флаг с именем `nameX`, где `name` и `X` снова ссылаются на название и идентификатор операции.

В зависимости от операции цвет флага появления может указывать на эффективность операции (см. ниже). Наличие разных идентификаторов операций позволяет выполнять несколько операций одного и того же типа одновременно.

Для некоторых операций может не потребоваться постоянное размещение флага (см. описание ниже).
<br>
<br>

#### 1. `Farming Power Banks`

* **Название операции:** `power`
* **Цвет:** Контролирует количество одновременных фермеров.

Автоматически сканирует данную комнату в поисках источника питания. Если один из них будет обнаружен, эта операция вызовет появление всех крипов, необходимых для фермы power bank.
<br>
<br>

#### 2. `Farming Deposits`

* **Название операции:** `deposits`
* **Цвет:** никакого эффекта

Автоматически сканирует выбранную комнату на предмет депозитов. Если один из них будет обнаружен, эта операция вызовет появление всех крипов, необходимых для его фарминга, пока время восстановления не станет неприемлемо высоким.

Установка флага `depositsX` в комнате, которая еще не была выбрана, приведет к выбору комнаты,
в то время как установка флага в комнате, которая уже была выбрана, отменит его выбор.
<br>
<br>
<br>

## 2. Modern operations
<br>

"Современные" операции предназначены для создания с помощью кода (т.е. автоматически).
Однако, пока этот код не существует, его все равно можно использовать и вручную.

Обычно это происходит так:

    Operation.createOperation("opType", { some: "memory" })
<br>

#### 1. `Атака на враждебные комнаты (Attacking hostile rooms)`

Спавнит несколько ботов, которые атакуют враждебную комнату.

Либо `attackers`, которые могут атаковать ботов и здания, либо `dismantlers`, которые могут атаковать только здания, но более эффективны в этом.

    Operation.createOperation("attack", { supportRoom: "roomName", targetPosition: new AbsolutePosition(new RoomPosition(x, y, roomName)) })

Необязательные параметры (в памяти):

* `attackRole`: Либо `attacker` либо `dismantler`
* `attackerCount`: Количество ботов для появления (по умолчанию 1)
* `useHeal`: Спавн целителя для каждого атакующего
* `useTough`: Используйте конфигурации для атакующих и целителей, которые включают в себя броню, чтобы сделать исцеление более эффективным
* `timeout`: Если указано, операция будет завершена по истечении заданного количества тиков
* `terminateAfterTick`: То же, что и `timeout`, но с указанием абсолютного числа тиков, после которого следует завершить операцию
* `terminateAfterSuccess`: Завершит операцию, как только все ключевые структуры будут уничтожены.
<br>
<br>

#### 2. `Атака на контроллер (Attacking a controller)`

Спавн бота для атаки на контроллер.

    Operation.createOperation("downgrade", { supportRoom: "roomName", targetRoom: "roomName" })
<br>

#### 3. `"Осушение" комнаты (Draining a room)`

Спавнит прыгуна и целителя. Бункер попытается высосать энергию из целевой комнаты, подвергаясь атаке башен.

Коротко: Для целевой комнаты происходит разрядка башен.

    Operation.createOperation("drain", { supportRoom: "roomName", targetRoom: "roomName" })

Необязательные параметры (в памяти):

* `useBoosts`: Стоит ли усиливать целителя
* `timeout`: Если указано, операция будет завершена по истечении заданного количества тиков
* `terminateAfterTick`: То же, что и `timeout`, но с указанием абсолютного числа тиков, после которого следует завершить операцию
<br>
<br>

#### 4. `Кража ресурсов (Stealing resources)`

Спавнит ботов, чтобы собирать ресурсы из комнаты.
Они будут собирать ресурсы на земле и в контейнерах.

    Operation.createOperation("scoop", { supportRoom: "roomName", targetRoom: "roomName" })

Необязательные параметры (в памяти):

* `scooperCount`: Количество ботов для появления (по умолчанию 1)
* `timeout`: Если указано, операция будет завершена по истечении заданного количества тиков
* `terminateAfterTick`: То же, что и `timeout`, но с указанием абсолютного числа тиков, после которого следует завершить операцию
* `terminateWhenEmpty`: Завершает операцию, как только основное хранилище и терминал будут исчерпаны.
* `waitForClear`: Не создавать ботов до того момента, пока комната будет признана безопасной (никаких башен или крипов).
<br>
<br>

### 5. `Захват комнаты (Claiming a room)`

Спавнит бота, за которым следуют завоеватели, чтобы создать первый spawn. Spawn будет построен на месте расположения флага заявки в целевой комнате.

После того, как spawn будет построен, комната поддержки продолжит поддерживать целевую комнату, отправляя в нее полностью обновленных майнеров, пока целевая комната не сможет позаботиться об этом сама.

    Operation.createOperation("claim", { supportRoom: "roomName", spawnPosition: new AbsolutePosition(new RoomPosition(x, y, roomName)) })

Необязательные параметры (в памяти):

* `spawnBuilders`: Комната поддержки отправит строителей в целевую комнату, чтобы ускорить процесс строительства
* `autoPlanRoom`: Установите значение true, чтобы автоматически планировать планировку помещения после захвата (**experimental**)
<br>
<br>
<br>

## 3. TODOs

* Используйте link для сбора энергии из удаленных шахт на границе помещения
* Улучшенная механика защиты
    * создавайте защитников в ответ на силу нападающих (без чрезмерной доставки)
    * башни должны атаковать цель, выбранную аспектом защиты
    * оборонный аспект должен на самом деле "подумать" о том, какую цель выбрать
* Автоматически начинайте претендовать, как только комната будет готова (например, если в данный момент на нее претендует другой игрок)
* Взаимодействие на основе флага
    * Ручное управление для транспортных средств снабжения
* Используйте наблюдателей, чтобы получить представление о комнате
* Улучшайте собственный следопыт
    * Планируйте маршруты в зависимости от известных фактов комнаты
    * автоматический сбор известных фактов о комнатах
* Автоматизированное создание базы?
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>



# ОРИГИНАЛ СТАТЬИ
<br>

# NobodysNightmare's Screeps AI

This is my personal AI for the computer game [Screeps](https://screeps.com).

## Manual control

### Memory Overrides

#### `Memory.hibernateGclFarming`

If `true`, RCL 8 rooms will only perform a minimal amount of upgrading,
but not upgrade at the maximum possible rate. This is intended to significantly
reduce the amount of energy spent, which in turn can shut down a larger part of
CPU consumption, since fewer remote mines should be necessary.

#### `Memory.sellPower`

If `true`, power is sold on the market rather than being refined.

#### `Memory.onlySellToNpcs`

If `true`, no trading will be performed with other players. Market code will
only consider NPC traders to sell resources.

#### `Memory.disableAutoExpansion`

If `true`, the AI will not try to automatically expand into new rooms.
This is useful if politics should drive expansion.

Note: Automatic expansion is currently experimental. It affects both
claiming new rooms and choosing remote mines.

#### `Memory.generatePixels`

Global switch to enable pixel generation. Pixels will be generated whenever the
bucket is full.

### Constructions

Multiple structures and structure groups can be pre-planned.
The general rule is to place a flag called `buildName`, to plan a structure called
`Name` (see below for valid values) at the specified position.
Using a flag called `removeName` you can remove the named structure at that position.

Depending on the structure, only a limited amount might be planned or the flag color might
have a meaning.

#### Extension Clusters

* **Building name:** `extensionCluster`
* **color:** no significance

Marks an area where multiple extensions will be built. The outline exactly fits the
roads that will be placed around the extensions.

#### Towers

* **Building name:** `tower`
* **color:** no significance

Plans a tower at the specified location.

#### Storage

* **Building name:** `storage`
* **color:** Determines direction of attached link. Starting top, clockwise.
  Only the first 4 colors are valid.

Marks the spot where the storage of the room shall be built. The outlines arrow indicates
at which location the associated link of the storage will be placed.

Note: Since only one storage can be placed, placing additional storages will clear the old
storage location.

#### Terminal

* **Building name:** `terminal`
* **color:** no significance

Plans a terminal at the specified location.

#### Reactor

* **Building name:** `reactor`
* **color:** Determines direction of entrance into reactor. Starting top left, clockwise.
  Only the first 4 colors are valid.

Around that spot labs will be built that will then process minerals to
compounds.

#### Booster

* **Building name:** `booster`
* **color:** no effect

Build a lab that will be used to boost creeps.

#### Walls

* **Building name:** `wall`

Need to place flag twice. First flag will set the start position, second flag the end.
Wall will be built as the corner from start to end, going into horizontal direction first.

### Spawning Creeps

There are multiple creep spawning operations available. They are all controlled using the same scheme.
The room that should spawn creeps receives a flag called `spawnNameX`, where `Name` is the name of the
operation (see below) and `X` is the operation identifier (e.g. `1`). The room targeted by the operation receives
a flag called `nameX`, where `name` and `X` again refer to the name and identifier of the operation.

Depending on the operation, the color of the spawn flag might indicate the strength of the operation
(see below). Having different operation identifiers allows to run multiple operations of the same type
simultaneously.

Some operations might not require flag to be permanently placed (see description below).

#### Farming Power Banks

* **Operation name:** `power`
* **color:** Controls number of simultaneous farmers.

Automatically scans the given room for a power bank. If one is detected, this operation will spawn
all creeps neccessary to farm the power bank.

#### Farming Deposits

* **Operation name:** `deposits`
* **color:** no effect

Automatically scans the selected rooms for deposits. If one is detected, this operation will spawn
all creeps neccessary to farm it until the cooldown is unsustainably high.

Placing the flag `depositsX` in a room that has not yet been selected will select the room,
while placing it in a room that has already been selected will deselect it.

## Modern operations

"Modern" operations are intended to be created through code (i.e. automatically).
However, as long as that code doesn't exist they can still be used manually as well.

It usually goes like this

    Operation.createOperation("opType", { some: "memory" })

#### Attacking hostile rooms

Spawns some creeps that attack a hostile room. Either `attackers`, which can engage creeps and structures
or `dismantlers`, which can only engage structures, but are more effective at that.

    Operation.createOperation("attack", { supportRoom: "roomName", targetPosition: new AbsolutePosition(new RoomPosition(x, y, roomName)) })

Optional parameters (in memory):

* `attackRole`: Either `attacker` or `dismantler`
* `attackerCount`: Number of attacker creeps to spawn (default 1)
* `useHeal`: Spawn a healer for each attacker.
* `useTough`: Use configurations on attackers and healers that include tough parts to make healing more efficient.
* `timeout`: If specified, the operation will be terminated after the given amount of ticks
* `terminateAfterTick`: Same as `timeout`, but specifying an absolute tick number after which to terminate the operation
* `terminateAfterSuccess`: Terminate the operation once all key structures have been destroyed.

#### Attacking a controller

Spawns a creep to attack a controller.

    Operation.createOperation("downgrade", { supportRoom: "roomName", targetRoom: "roomName" })

#### Draining a room

Spawns a pair of hopper and healer. The hopper will try to drain energy from the target room by being
attacked by towers.

    Operation.createOperation("drain", { supportRoom: "roomName", targetRoom: "roomName" })

Optional parameters (in memory):

* `useBoosts`: Whether to boost the healer.
* `timeout`: If specified, the operation will be terminated after the given amount of ticks
* `terminateAfterTick`: Same as `timeout`, but specifying an absolute tick number after which to terminate the operation

#### Stealing resources

Spawns creeps to scoop resources from a room.
They will pickup resources on the ground and in containers.

    Operation.createOperation("scoop", { supportRoom: "roomName", targetRoom: "roomName" })

Optional parameters (in memory):

* `scooperCount`: Number of scooper creeps to spawn (default 1)
* `timeout`: If specified, the operation will be terminated after the given amount of ticks
* `terminateAfterTick`: Same as `timeout`, but specifying an absolute tick number after which to terminate the operation
* `terminateWhenEmpty`: Terminates the operation, once the main storage and terminal of a room are depleted.
* `waitForClear`: Do not start spawning scoopers, before the room is considered safe (no towers or creeps).

### Claiming a room

Spawns a claimer followed by conquerors to build up the first spawn. The spawn will be built
at the location of the claim flag in the target room.

After the spawn was built, the support room will continue to support the target room by sending
fully upgraded miners into it, until the target room can take care of that by itself.

    Operation.createOperation("claim", { supportRoom: "roomName", spawnPosition: new AbsolutePosition(new RoomPosition(x, y, roomName)) })

Optional parameters (in memory):

* `spawnBuilders`: Support room will also send builders to the target room to speed up building stuff
* `autoPlanRoom`: Set to true, to let the layout of the room be automatically planned once captured (**experimental**)

## TODOs

* Use links to collect energy from remote mines at room border
* Better defense mechanics
    * spawn defenders in response to attackers force (no over-delivering)
    * towers should attack target picked by defense aspect
    * defense aspect should actually "think" about which target to pick
* Automatically start claiming as soon as room is ready (e.g. if it is currently claimed by another player)
* Flag-based interaction
    * Manual operation for supply transports
* Use observers to obtain vision on a room
* Improve own pathfinder
    * Plan routes depending on known facts about rooms
    * automatically collect known facts about rooms
* Automated base-building?
