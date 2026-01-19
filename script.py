import os
import pathlib
import sys

def print_file_contents(file_path):
    """Выводит содержимое файла с заголовком"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()

        print("\n" + "=" * 80)
        print(f"ФАЙЛ: {file_path}")
        print("=" * 80)
        print(content)
        print("=" * 80)

    except UnicodeDecodeError:
        try:
            with open(file_path, 'r', encoding='cp1251') as file:
                content = file.read()

            print("\n" + "=" * 80)
            print(f"ФАЙЛ: {file_path} (кодировка: cp1251)")
            print("=" * 80)
            print(content)
            print("=" * 80)

        except Exception as e:
            print(f"\nОшибка чтения файла {file_path}: {e}")

    except Exception as e:
        print(f"\nОшибка чтения файла {file_path}: {e}")

def main():
    current_dir = pathlib.Path("./src")

    # Ищем все .tsx и .css файлы
    tsx_files = list(current_dir.rglob("*.tsx"))
    css_files = list(current_dir.rglob("*.css"))

    all_files = tsx_files + css_files

    if not all_files:
        print("Не найдено .tsx или .css файлов в текущей директории и поддиректориях.")
        return

    print(f"Найдено файлов: .tsx - {len(tsx_files)}, .css - {len(css_files)}")
    print(f"Всего файлов: {len(all_files)}")

    # Сортируем файлы по алфавиту для удобства
    all_files.sort()

    total_files = len(all_files)
    for i, file_path in enumerate(all_files, 1):
        print(f"\nОбработка файла {i}/{total_files}: {file_path}")
        print_file_contents(file_path)

        # Пауза после каждого файла (опционально)
        if i < total_files:
            try:
                input("\nНажмите Enter для продолжения...")
            except KeyboardInterrupt:
                print("\nПрервано пользователем.")
                sys.exit(0)

    print(f"\nГотово! Обработано файлов: {total_files}")

if __name__ == "__main__":
    main()