import random

warrior = {"career": "战士", "hp": 60, "damage": 25, "defense": 25}
mage = {"career": "法师", "hp": 30, "damage": 50, "defense": 10}
knight = {"career": "骑士", "hp": 60, "damage": 15, "defense": 50}
assassin = {"career": "刺客", "hp": 20, "damage": 70, "defense": 5}

bee_info= {"name": "毒蜂", "min_level": 1, "max_level": 1, "hp": 10, "damage": 5, "defense": 30, "exp": 2}
slime_info = {"name": "史莱姆", "min_level": 1, "max_level": 5, "hp": 20, "damage": 15, "defense": 2, "exp": 2}
goblin_info = {"name": "哥布林", "min_level": 6, "max_level": 10, "hp": 30, "damage": 25, "defense": 25, "exp": 10}
wolf_info = {"name": "苍狼", "min_level": 11, "max_level": 15, "hp": 50, "damage": 50, "defense": 50, "exp": 50}
gaurder_info = {"name": "守卫者", "min_level": 16, "max_level": 24, "hp": 50, "damage": 80, "defense": 100, "exp": 75}
dragon_info = {"name": "魔龙", "min_level": 30, "max_level": 30, "hp": 120, "damage": 100, "defense": 70, "exp": 100}

class Hero:
    def __init__(self, name, info):
        self.name = name  # 名字
        self.career = info["career"]  # 职业
        self.level = 1  # 等级
        self.exp = 0  # 经验
        self.max_hp = info['hp']  # 最大生命值
        self.hp = self.max_hp  # 当前生命值
        self.damage = info['damage']  # 攻击力
        self.defense = info['defense']  # 防御力


    def show_info(self):
        print(f"名字：{self.name}")
        print(f"职业：{self.career}")
        print(f"等级：{self.level}")
        print(f"经验：{self.exp}/10")
        print(f"生命：{self.hp}/{self.max_hp}")
        print(f"攻击：{self.damage}")
        print(f"防御：{self.defense}")
        print("————————————————————————————————————————")

    def attack(self, enemy):
        damage = max(self.damage+self.level - enemy.defense, 1)*random.randint(1,3)
        enemy.hp -= damage-random.randint(0,2)
        print(f"{self.name}对{enemy.name}造成了{damage}点伤害！")
        print("————————————————————————————————————————")

    def level_up(self):
        self.level+=self.exp%10+1


class Monster:
    def __init__(self, info):
        self.name = info["name"]
        self.level = random.randint(info["min_level"], info["max_level"])
        self.max_hp = info['hp'] * self.level
        self.hp = self.max_hp
        self.damage = info["damage"] * self.level
        self.defense = info["defense"] * self.level
        self.exp = info["exp"] * self.level

    def show_info(self):
        print(f"名字：{self.name}")
        print(f"等级：{self.level}")
        print(f"经验：{self.exp}/10")
        print(f"生命：{self.hp}/{self.max_hp}")
        print(f"攻击：{self.damage}")
        print(f"防御：{self.defense}")
        print("————————————————————————————————————————")

    def attack(self, enemy):
        damage = max(self.damage - enemy.defense+enemy.level, 0.5)
        enemy.hp -= damage
        print(f"{self.name}对{enemy.name}造成了{damage}点伤害！")
        print("————————————————————————————————————————")

print("你来到了异世界。")
print("这里的村民曾经安居乐业，可在上百年前，一条魔龙从天而降！")
print("它将村民们捕入炼狱之中，用它的魔力封印整个世界。")
print()
print("而你，是天选的勇者。")
print("你要击杀怪物，提升等级，最终打败魔龙！")
print()
round_count=0
monster_kind=0
hero_name=input("你的名字是：")
hero_career=input("你的职业是 w：战士 m：法师 k：骑士 a：刺客：")
if hero_career=="w":
    hero = Hero(hero_name,warrior)
elif hero_career=="m":
    hero = Hero(hero_name,mage)
elif hero_career=="k":
    hero = Hero(hero_name,knight)
elif hero_career=="a":
    hero = Hero(hero_name, assassin)
hero.show_info()
while True:
    round_count += 1
    print(f"第{round_count}回合")
    monster_kind=random.randint(1,max(round_count,3))
    if monster_kind%3==0:
        monster = Monster(bee_info)
        print("有怪物。")
        monster.show_info()
    elif monster_kind%4==0:
        monster = Monster(slime_info)
        print("有怪物。")
        monster.show_info()
    elif monster_kind%5==0:
        monster = Monster(goblin_info)
        print("有怪物。")
        monster.show_info()
    elif monster_kind%10==0:
        monster = Monster(wolf_info)
        print("有怪物。")
        monster.show_info()
    elif monster_kind%20==0:
        monster = Monster(gaurder_info)
        print("有怪物。")
        monster.show_info()
    else:
        print("没有怪物。")
        continue
    next_step=input("下一步：")
    if next_step=="attack":
        hero.attack(monster)
        while monster.hp>0:
            monster.attack(hero)
            monster.show_info()
            if hero.hp <= 0:
                print("你失败了！")
                break
        if hero.hp > 0 and monster.hp <= 0:
            hero.exp+=monster.exp
            print(f"{hero.name}击杀了{monster.name}")
            hero.show_info()

    hero.level_up()
    if hero.hp<=0:
        print("你失败了！")
        break
